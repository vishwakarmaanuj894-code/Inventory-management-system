using System.ComponentModel.DataAnnotations;

namespace InventoryManagementSystem.Api.DTOs
{
    public class SaleItemInputDto
    {
        [Required(ErrorMessage = "Product ID is required")]
        public string ProductId { get; set; } = string.Empty;

        [Range(1, 100000, ErrorMessage = "Quantity must be at least 1")]
        public int Quantity { get; set; }

        /// <summary>
        /// Optional client selling price; server validates and defaults to product catalog price if null or modified.
        /// </summary>
        public decimal? CustomSellingPrice { get; set; }
    }

    public class SaleCreateDto
    {
        public string? InvoiceNumber { get; set; }

        [Required(ErrorMessage = "Customer name is required")]
        [StringLength(100, MinimumLength = 2)]
        public string CustomerName { get; set; } = "Walk-in Customer";

        public string CustomerPhone { get; set; } = string.Empty;
        public string CustomerEmail { get; set; } = string.Empty;

        [Required(ErrorMessage = "Sale items cannot be empty")]
        [MinLength(1, ErrorMessage = "Must include at least one product item")]
        public List<SaleItemInputDto> Items { get; set; } = new();

        [Range(0, 28, ErrorMessage = "Tax rate must be between 0% and 28%")]
        public decimal TaxRate { get; set; } = 18m;

        [Range(0, 1000000, ErrorMessage = "Discount cannot be negative")]
        public decimal Discount { get; set; } = 0m;

        public string PaymentMethod { get; set; } = "UPI";
        public string Notes { get; set; } = string.Empty;
    }

    public class SaleItemResponseDto
    {
        public string ProductId { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public string Sku { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal SellingPrice { get; set; }
        public decimal CostPriceAtSale { get; set; }
        public decimal Total { get; set; }
    }

    public class SaleResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string InvoiceNumber { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string CustomerEmail { get; set; } = string.Empty;
        public List<SaleItemResponseDto> Items { get; set; } = new();
        public decimal Subtotal { get; set; }
        public decimal TotalCostBasis { get; set; }
        public decimal TaxRate { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal Discount { get; set; }
        public decimal GrandTotal { get; set; }
        public decimal GrossProfit { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
