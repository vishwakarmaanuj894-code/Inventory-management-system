namespace InventoryManagementSystem.Api.DTOs
{
    public class DashboardSummaryDto
    {
        public int TotalProducts { get; set; }
        public int TotalCategories { get; set; }
        public int TotalSuppliers { get; set; }
        public int TotalSalesCount { get; set; }
        public int TotalPurchasesCount { get; set; }
        public int AvailableStockUnits { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal TotalProcurementCost { get; set; }
        public decimal EstimatedProfit { get; set; }
        public decimal ProfitMarginPercentage { get; set; }

        public List<RecentTransactionDto> RecentTransactions { get; set; } = new();
        public List<ProductResponseDto> LowStockAlerts { get; set; } = new();
        public List<TopSellingProductDto> TopSellingProducts { get; set; } = new();
    }

    public class RecentTransactionDto
    {
        public string Type { get; set; } = string.Empty; // SALE, PURCHASE
        public string Id { get; set; } = string.Empty;
        public string InvoiceNumber { get; set; } = string.Empty;
        public string PartyName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime Date { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class TopSellingProductDto
    {
        public string ProductId { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public string Sku { get; set; } = string.Empty;
        public int UnitsSold { get; set; }
        public decimal Revenue { get; set; }
        public decimal GrossProfit { get; set; }
    }

    public class MonthlySalesOverviewDto
    {
        public string MonthName { get; set; } = string.Empty;
        public int Year { get; set; }
        public decimal SalesAmount { get; set; }
        public decimal PurchasesAmount { get; set; }
    }
}
