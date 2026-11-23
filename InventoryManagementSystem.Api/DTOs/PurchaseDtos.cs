using System.ComponentModel.DataAnnotations;

namespace InventoryManagementSystem.Api.DTOs
{
    public class PurchaseItemInputDto
    {
        [Required(ErrorMessage = "Product ID is required")]
        public string ProductId { get; set; } = string.Empty;

        [Range(1, 100000, ErrorMessage = "Quantity must be at least 1")]
        public int Quantity { get; set; }

        [Range(0.01, 10000000, ErrorMessage = "Purchase price must be positive")]
        public decimal PurchasePrice { get; set; }
    }

    public class PurchaseCreateDto
    {
        public string? InvoiceNumber { get; set; }

        [Required(ErrorMessage = "Supplier ID is required")]
        public string SupplierId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Purchase items cannot be empty")]
        [MinLength(1, ErrorMessage = "Must include at least one product item")]
        public List<PurchaseItemInputDto> Items { get; set; } = new();

        [Range(0, 28, ErrorMessage = "GST Tax rate must be between 0% and 28%")]
        public decimal TaxRate { get; set; } = 18m;

        [Range(0, 1000000, ErrorMessage = "Discount cannot be negative")]
        public decimal Discount { get; set; } = 0m;

        public string PaymentMethod { get; set; } = "Bank Transfer";
        public string Notes { get; set; } = string.Empty;
    }

    public class PurchaseItemResponseDto
    {
        public string ProductId { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public string Sku { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal PurchasePrice { get; set; }
        public decimal Total { get; set; }
    }

    public class PurchaseResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string InvoiceNumber { get; set; } = string.Empty;
        public string SupplierId { get; set; } = string.Empty;
        public string SupplierName { get; set; } = string.Empty;
        public List<PurchaseItemResponseDto> Items { get; set; } = new();
        public decimal Subtotal { get; set; }
        public decimal TaxRate { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal Discount { get; set; }
        public decimal GrandTotal { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
