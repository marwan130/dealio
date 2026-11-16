namespace Dealio.Domain.Entities;

// An AI-researched spec sheet for a product. One row per product,  the
// specs themselves are a JSON blob ({"label": "value", ...}) so the
// schema can absorb whatever a category needs without migrations.
// Populated on demand by the specs research endpoint, cached thereafter.
public class ProductSpec
{
    public Guid SpecId { get; set; }
    public Guid ProductId { get; set; }
    public string SpecsJson { get; set; } = "{}";
    // Where the sheet came from: "ai" (LLM research) today, "manual"
    // later if curated entries land.
    public string Source { get; set; } = "ai";
    // The model that produced the sheet, for provenance/audit.
    public string Model { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Product Product { get; set; } = null!;
}
