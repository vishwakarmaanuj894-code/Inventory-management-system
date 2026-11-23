using System.ComponentModel.DataAnnotations;

namespace InventoryManagementSystem.Api.DTOs
{
    public class StockAdjustmentDto
    {
        [Required(ErrorMessage = "Product ID is required")]
        public string ProductId { get; set; } = string.Empty;

        /// <summary>
        /// Adjustment type: add, subtract, set
        /// </summary>
        [Required(ErrorMessage = "Adjustment type is required (add, subtract, set)")]
        [RegularExpression("^(add|subtract|set)$", ErrorMessage = "Adjustment type must be 'add', 'subtract', or 'set'")]
        public string AdjustmentType { get; set; } = "add";

        [Range(0, 1000000, ErrorMessage = "Quantity must be non-negative")]
        public int Quantity { get; set; }

        [Required(ErrorMessage = "Reason for adjustment is mandatory for warehouse audit")]
        [StringLength(150, MinimumLength = 3, ErrorMessage = "Reason must be between 3 and 150 characters")]
        public string Reason { get; set; } = string.Empty;

        public string Notes { get; set; } = string.Empty;
    }

    public class StockTransactionResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string ProductId { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public string Sku { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public int PreviousStock { get; set; }
        public int NewStock { get; set; }
        public string ReferenceId { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
    }

    public class StockOverviewDto
    {
        public int TotalItems { get; set; }
        public int InStockCount { get; set; }
        public int LowStockCount { get; set; }
        public int OutOfStockCount { get; set; }
        public int TotalUnitsOnHand { get; set; }
        public decimal TotalValuationAtCost { get; set; }
        public decimal TotalValuationAtRetail { get; set; }
    }
}
