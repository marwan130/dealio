namespace Dealio.Infrastructure.Persistence.Configurations;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Dealio.Domain.Entities;

public class ProductSpecConfiguration : IEntityTypeConfiguration<ProductSpec>
{
    public void Configure(EntityTypeBuilder<ProductSpec> builder)
    {
        builder.ToTable("ProductSpecs");

        builder.HasKey(s => s.SpecId);

        builder.Property(s => s.SpecId)
               .HasDefaultValueSql("gen_random_uuid()");

        builder.Property(s => s.SpecsJson)
               .IsRequired();

        builder.Property(s => s.Source)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(s => s.Model)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(s => s.CreatedAt)
               .IsRequired()
               .HasDefaultValueSql("now()");

        builder.Property(s => s.UpdatedAt)
               .IsRequired()
               .HasDefaultValueSql("now()");

        // One sheet per product.
        builder.HasIndex(s => s.ProductId)
               .IsUnique()
               .HasDatabaseName("ux_product_specs_product");

        builder.HasOne(s => s.Product)
               .WithMany()
               .HasForeignKey(s => s.ProductId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
