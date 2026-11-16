namespace Dealio.Application.Interfaces.Services;

using Dealio.Application.DTOs.Products;

// Researches (and caches) a product's spec sheet with an LLM. Returns
// null when the feature is not configured (no API key) or the provider
// failed ,  callers degrade to "no specs" instead of erroring.
public interface IProductSpecService
{
    Task<ProductSpecsResponse?> GetCachedAsync(Guid productId);
    Task<ProductSpecsResponse?> GenerateAsync(Guid productId);
    bool IsConfigured { get; }
}
