namespace Dealio.Infrastructure.Research;

using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Dealio.Application.DTOs.Products;
using Dealio.Application.Interfaces.Services;
using Dealio.Domain.Entities;
using Dealio.Infrastructure.Persistence;

// LLM-researched product spec sheets, backed by Google AI Studio's
// (Gemini) free tier. The provider is deliberately isolated behind this
// one class ,  swapping providers later means replacing this file and
// its options binding, nothing else.
//
// Sheets are produced ON DEMAND (a signed in user clicks "research")
// and cached one row per product in ProductSpecs, so a busy deployment
// costs at most one free tier request per product ever.
public sealed class GeminiSpecOptions
{
    public string ApiKey { get; set; } = string.Empty;
    // "flash-latest" is a rolling alias pinned to Google's current flash
    // model ,  it can't 404 the way a pinned version does when Google
    // retires it (gemini 2.0-flash did exactly that in late 2026).
    public string Model { get; set; } = "gemini-3.5-flash";
    public int MaxFields { get; set; } = 14;
}

public sealed class GeminiProductSpecService(
    IHttpClientFactory httpClientFactory,
    IOptions<GeminiSpecOptions> options,
    ApplicationDbContext db,
    ILogger<GeminiProductSpecService> logger) : IProductSpecService
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly GeminiSpecOptions _options = options.Value;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_options.ApiKey);

    public async Task<ProductSpecsResponse?> GetCachedAsync(Guid productId)
    {
        var sheet = await db.ProductSpecs.AsNoTracking()
                        .FirstOrDefaultAsync(s => s.ProductId == productId);
        return sheet is null ? null : ToResponse(sheet);
    }

    public async Task<ProductSpecsResponse?> GenerateAsync(Guid productId)
    {
        if (!IsConfigured) return null;

        // Cached forever: a product costs at most one free tier call,
        // ever ,  a repeat click returns the stored sheet.
        var cached = await GetCachedAsync(productId);
        if (cached is not null) return cached;

        // The prompt is grounded in what the catalog already knows so the
        // model researches THIS product, not a name collision twin.
        var product = await db.Products.AsNoTracking()
                          .Where(p => p.ProductId == productId)
                          .Select(p => new
                          {
                              p.Name,
                              p.Brand,
                              Category = p.Category != null ? p.Category.Name : null,
                              p.Description,
                              Market = p.Listings
                                        .Where(l => !l.IsExcluded)
                                        .Select(l => l.Store.Country)
                                        .FirstOrDefault(),
                          })
                          .FirstOrDefaultAsync();
        if (product is null) return null;

        var fields = await RequestSpecsAsync(product.Name, product.Brand, product.Category, product.Description, product.Market);
        if (fields is null || fields.Count == 0) return null;

        var now = DateTime.UtcNow;
        var sheet = await db.ProductSpecs.FirstOrDefaultAsync(s => s.ProductId == productId);
        if (sheet is null)
        {
            sheet = new ProductSpec { ProductId = productId };
            db.ProductSpecs.Add(sheet);
        }

        sheet.SpecsJson = JsonSerializer.Serialize(fields, SerializerOptions);
        sheet.Source = "ai";
        sheet.Model = _options.Model;
        sheet.UpdatedAt = now;

        await db.SaveChangesAsync();

        sheet.CreatedAt = now; // fresh row default,  materialize for the response
        return ToResponse(sheet);
    }

    private async Task<List<ProductSpecField>?> RequestSpecsAsync(
        string name, string? brand, string? category, string? description, string? market)
    {
        var prompt = new StringBuilder()
            .AppendLine("You are a product specification researcher for a price-comparison app.")
            .AppendLine($"Product: {name}")
            .AppendLine(brand is null ? "" : $"Brand: {brand}")
            .AppendLine(category is null ? "" : $"Category: {category}")
            .AppendLine(market is null ? "" : $"Sold in market: {market}")
            .AppendLine(description is null ? "" : $"Catalog description: {Truncate(description, 400)}")
            .AppendLine()
            .AppendLine($"Research this exact product and return its {MaxFieldsClause(_options.MaxFields)} most important")
            .AppendLine("purchase-relevant specifications (e.g. for headphones: driver, battery life, weight,")
            .AppendLine("connectivity, codecs; for laptops: CPU, RAM, storage, display). Rules:")
            .AppendLine("- Only include facts you are confident belong to this exact product/model.")
            .AppendLine("- Keep each value concise, with units, e.g. \"30 hours\", \"250 g\".")
            .AppendLine("- Use short Title Case labels. Omit anything you cannot verify.")
            .AppendLine("- No marketing copy, no source URLs.")
            .ToString();

        var body = new
        {
            contents = new[]
            {
                new { parts = new[] { new { text = prompt } } },
            },
            generationConfig = new
            {
                responseMimeType = "application/json",
                responseSchema = new
                {
                    type = "OBJECT",
                    properties = new
                    {
                        specs = new
                        {
                            type = "ARRAY",
                            items = new
                            {
                                type = "OBJECT",
                                properties = new
                                {
                                    label = new { type = "STRING" },
                                    value = new { type = "STRING" },
                                },
                                required = new[] { "label", "value" },
                            },
                        },
                    },
                    required = new[] { "specs" },
                },
            },
        };

        var client = httpClientFactory.CreateClient("ai-specs");
        HttpResponseMessage response;
        try
        {
            response = await client.PostAsync(
                $"https://generativelanguage.googleapis.com/v1beta/models/{_options.Model}:generateContent?key={_options.ApiKey}",
                JsonContent.Create(body));
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            logger.LogWarning(ex, "Gemini spec research call failed (network/timeout) for model {Model}", _options.Model);
            return null;
        }
        using var _ = response;

        if (!response.IsSuccessStatusCode)
        {
            var bodyText = await response.Content.ReadAsStringAsync();
            logger.LogWarning("Gemini spec research failed: HTTP {Status} — {Body}", (int)response.StatusCode, Truncate(bodyText, 500));
            return null;
        }

        GeminiResponse? payload;
        try
        {
            payload = await response.Content.ReadFromJsonAsync<GeminiResponse>(SerializerOptions);
        }
        catch (JsonException)
        {
            return null;
        }

        var text = payload?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;
        if (string.IsNullOrWhiteSpace(text)) return null;

        List<ProductSpecField>? fields;
        try
        {
            // The responseSchema wraps the array in a "specs" object.
            fields = JsonSerializer.Deserialize<SpecsEnvelope>(text, SerializerOptions)?.Specs;
        }
        catch (JsonException)
        {
            return null;
        }

        return fields?
            .Where(f => !string.IsNullOrWhiteSpace(f.Label) && !string.IsNullOrWhiteSpace(f.Value))
            .DistinctBy(f => f.Label.Trim(), StringComparer.OrdinalIgnoreCase)
            .Take(_options.MaxFields)
            .Select(f => new ProductSpecField { Label = f.Label.Trim(), Value = f.Value.Trim() })
            .ToList();
    }

    private static string MaxFieldsClause(int max) => max <= 0 ? "key" : $"up to {max}";

    private static string Truncate(string value, int max) =>
        value.Length <= max ? value : value[..max] + "…";
    private ProductSpecsResponse ToResponse(ProductSpec sheet)
    {
        var fields = new List<ProductSpecField>();
        try
        {
            fields = JsonSerializer.Deserialize<List<ProductSpecField>>(sheet.SpecsJson, SerializerOptions) ?? fields;
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "Stored ProductSpecs JSON is unreadable, rendering an empty sheet for product {ProductId}", sheet.ProductId);
        }

        return new ProductSpecsResponse
        {
            ProductId = sheet.ProductId,
            Source = sheet.Source,
            Model = sheet.Model,
            UpdatedAt = sheet.UpdatedAt,
            Fields = fields,
        };
    }

    private sealed class GeminiResponse
    {
        [JsonPropertyName("candidates")]
        public List<GeminiCandidate>? Candidates { get; set; }
    }

    private sealed class SpecsEnvelope
    {
        [JsonPropertyName("specs")]
        public List<ProductSpecField>? Specs { get; set; }
    }

    private sealed class GeminiCandidate
    {
        [JsonPropertyName("content")]
        public GeminiContent? Content { get; set; }
    }

    private sealed class GeminiContent
    {
        [JsonPropertyName("parts")]
        public List<GeminiPart>? Parts { get; set; }
    }

    private sealed class GeminiPart
    {
        [JsonPropertyName("text")]
        public string? Text { get; set; }
    }
}
