using System.ComponentModel.DataAnnotations;

namespace InventoryManagementSystem.Api.DTOs
{
    public class ProductCreateDto
    {
        [Required(ErrorMessage = "Product name is required")]
        [StringLength(150, MinimumLength = 2, ErrorMessage = "Product name must be between 2 and 150 characters")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "SKU is required")]
        [StringLength(50, MinimumLength = 2, ErrorMessage = "SKU must be between 2 and 50 characters")]
        public string Sku { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        [Required(ErrorMessage = "Category ID is required")]
        public string CategoryId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Supplier ID is required")]
        public string SupplierId { get; set; } = string.Empty;

        [Range(0, 10000000, ErrorMessage = "Purchase price must be positive")]
        public decimal PurchasePrice { get; set; }

        [Range(0, 10000000, ErrorMessage = "Selling price must be positive")]
        public decimal SellingPrice { get; set; }

        [Range(0, 1000000, ErrorMessage = "Stock quantity cannot be negative")]
        public int StockQuantity { get; set; }

        [Range(1, 10000, ErrorMessage = "Minimum stock level must be at least 1")]
        public int MinStockLevel { get; set; } = 5;

        public string Unit { get; set; } = "pcs";
        public string ImageUrl { get; set; } = string.Empty;
    }

    public class ProductUpdateDto
    {
        [Required(ErrorMessage = "Product name is required")]
        [StringLength(150, MinimumLength = 2)]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "SKU is required")]
        public string Sku { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        [Required(ErrorMessage = "Category ID is required")]
        public string CategoryId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Supplier ID is required")]
        public string SupplierId { get; set; } = string.Empty;

        [Range(0, 10000000)]
        public decimal PurchasePrice { get; set; }

        [Range(0, 10000000)]
        public decimal SellingPrice { get; set; }

        [Range(0, 1000000)]
        public int StockQuantity { get; set; }

        [Range(1, 10000)]
        public int MinStockLevel { get; set; } = 5;

        public string Unit { get; set; } = "pcs";
        public string ImageUrl { get; set; } = string.Empty;
    }

    public class ProductResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Sku { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string CategoryId { get; set; } = string.Empty;
        public string CategoryName { get; set; } = string.Empty;
        public string SupplierId { get; set; } = string.Empty;
        public string SupplierName { get; set; } = string.Empty;
        public decimal PurchasePrice { get; set; }
        public decimal SellingPrice { get; set; }
        public int StockQuantity { get; set; }
        public int MinStockLevel { get; set; }
        public string Unit { get; set; } = "pcs";
        public string ImageUrl { get; set; } = string.Empty;
        public string Status { get; set; } = "in_stock";
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class ProductFilterDto
    {
        public string? Search { get; set; }
        public string? CategoryId { get; set; }
        public string? Status { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 100;
    }
}
