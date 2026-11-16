namespace Dealio.Application.DTOs.Products;

// An AI-researched spec sheet. Fields is an ordered label/value list . 
// stable for rendering, flat enough for the LLM's JSON output to map
// straight onto.
public class ProductSpecsResponse
{
    public Guid ProductId { get; set; }
    public string Source { get; set; } = "ai";
    public string Model { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
    public List<ProductSpecField> Fields { get; set; } = new();
}

public class ProductSpecField
{
    public string Label { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}
