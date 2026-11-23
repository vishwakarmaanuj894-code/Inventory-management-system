namespace InventoryManagementSystem.Api.DTOs
{
    public class ReportFilterDto
    {
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string Timeframe { get; set; } = "all"; // all, today, week, month
    }

    public class ProfitReportDto
    {
        public decimal GrossRevenue { get; set; }
        public decimal CostOfGoodsSold { get; set; }
        public decimal GrossProfit { get; set; }
        public decimal ProfitMarginPercentage { get; set; }
        public int TotalTransactions { get; set; }
    }

    public class ProductSalesReportDto
    {
        public string ProductId { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public string Sku { get; set; } = string.Empty;
        public int UnitsSold { get; set; }
        public decimal Revenue { get; set; }
        public decimal CostOfGoodsSold { get; set; }
        public decimal GrossProfit { get; set; }
        public decimal MarginPercentage { get; set; }
    }

    public class InventoryValuationReportDto
    {
        public int TotalUniqueItems { get; set; }
        public int TotalQuantityOnHand { get; set; }
        public decimal TotalValuationAtCost { get; set; }
        public decimal PotentialRevenueAtRetail { get; set; }
        public decimal ProjectedGrossMargin { get; set; }
    }

    public class ReportSummaryDto
    {
        public ProfitReportDto ProfitSummary { get; set; } = new();
        public InventoryValuationReportDto InventorySummary { get; set; } = new();
        public List<ProductSalesReportDto> ProductBreakdown { get; set; } = new();
        public List<SaleResponseDto> Sales { get; set; } = new();
        public List<PurchaseResponseDto> Purchases { get; set; } = new();
    }
}
