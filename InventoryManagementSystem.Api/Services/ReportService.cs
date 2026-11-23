using InventoryManagementSystem.Api.DTOs;
using InventoryManagementSystem.Api.Repositories;

namespace InventoryManagementSystem.Api.Services
{
    public interface IReportService
    {
        Task<ApiResponse<ReportSummaryDto>> GetReportSummaryAsync(ReportFilterDto filter);
    }

    public class ReportService : IReportService
    {
        private readonly ISaleRepository _saleRepository;
        private readonly IPurchaseRepository _purchaseRepository;
        private readonly IProductRepository _productRepository;

        public ReportService(
            ISaleRepository saleRepository,
            IPurchaseRepository purchaseRepository,
            IProductRepository productRepository)
        {
            _saleRepository = saleRepository;
            _purchaseRepository = purchaseRepository;
            _productRepository = productRepository;
        }

        public async Task<ApiResponse<ReportSummaryDto>> GetReportSummaryAsync(ReportFilterDto filter)
        {
            DateTime? startDate = filter.StartDate;
            DateTime? endDate = filter.EndDate;

            if (!startDate.HasValue && !endDate.HasValue && !string.IsNullOrWhiteSpace(filter.Timeframe))
            {
                var now = DateTime.UtcNow;
                switch (filter.Timeframe.ToLowerInvariant())
                {
                    case "today":
                        startDate = new DateTime(now.Year, now.Month, now.Day, 0, 0, 0, DateTimeKind.Utc);
                        break;
                    case "week":
                        startDate = now.AddDays(-7);
                        break;
                    case "month":
                        startDate = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                        break;
                }
            }

            var salesTask = _saleRepository.GetByDateRangeAsync(startDate, endDate);
            var purchasesTask = _purchaseRepository.GetByDateRangeAsync(startDate, endDate);
            var productsTask = _productRepository.GetAllAsync();

            await Task.WhenAll(salesTask, purchasesTask, productsTask);

            var sales = salesTask.Result;
            var purchases = purchasesTask.Result;
            var products = productsTask.Result;

            // 1. Profit Calculation based on IMMUTABLE recorded CostPriceAtSale
            var grossRevenue = sales.Sum(s => s.GrandTotal);
            var costOfGoodsSold = sales.Sum(s => s.TotalCostBasis);
            var grossProfit = Math.Max(0m, grossRevenue - costOfGoodsSold);
            var marginPercent = grossRevenue > 0 ? Math.Round((grossProfit / grossRevenue) * 100m, 1) : 0m;

            var profitSummary = new ProfitReportDto
            {
                GrossRevenue = grossRevenue,
                CostOfGoodsSold = costOfGoodsSold,
                GrossProfit = grossProfit,
                ProfitMarginPercentage = marginPercent,
                TotalTransactions = sales.Count
            };

            // 2. Inventory Asset Valuation
            var totalQty = products.Sum(p => p.StockQuantity);
            var valAtCost = products.Sum(p => p.StockQuantity * p.PurchasePrice);
            var valAtRetail = products.Sum(p => p.StockQuantity * p.SellingPrice);
            var projectedMargin = valAtRetail > 0 ? Math.Round(((valAtRetail - valAtCost) / valAtRetail) * 100m, 1) : 0m;

            var inventorySummary = new InventoryValuationReportDto
            {
                TotalUniqueItems = products.Count,
                TotalQuantityOnHand = totalQty,
                TotalValuationAtCost = valAtCost,
                PotentialRevenueAtRetail = valAtRetail,
                ProjectedGrossMargin = projectedMargin
            };

            // 3. Product-wise sales breakdown with recorded historical cost basis
            var productMap = new Dictionary<string, ProductSalesReportDto>();
            foreach (var sale in sales)
            {
                foreach (var item in sale.Items)
                {
                    if (!productMap.ContainsKey(item.ProductId))
                    {
                        productMap[item.ProductId] = new ProductSalesReportDto
                        {
                            ProductId = item.ProductId,
                            ProductName = item.ProductName,
                            Sku = item.Sku,
                            UnitsSold = 0,
                            Revenue = 0m,
                            CostOfGoodsSold = 0m,
                            GrossProfit = 0m,
                            MarginPercentage = 0m
                        };
                    }

                    var p = productMap[item.ProductId];
                    var itemCost = item.CostPriceAtSale * item.Quantity;
                    var itemProfit = item.Total - itemCost;

                    p.UnitsSold += item.Quantity;
                    p.Revenue += item.Total;
                    p.CostOfGoodsSold += itemCost;
                    p.GrossProfit += Math.Max(0m, itemProfit);
                }
            }

            var productBreakdown = productMap.Values.Select(p =>
            {
                p.MarginPercentage = p.Revenue > 0 ? Math.Round((p.GrossProfit / p.Revenue) * 100m, 1) : 0m;
                return p;
            }).OrderByDescending(p => p.Revenue).ToList();

            var mappedSales = sales.Select(s => new SaleResponseDto
            {
                Id = s.Id,
                InvoiceNumber = s.InvoiceNumber,
                CustomerName = s.CustomerName,
                CustomerPhone = s.CustomerPhone,
                CustomerEmail = s.CustomerEmail,
                Items = s.Items.Select(i => new SaleItemResponseDto
                {
                    ProductId = i.ProductId,
                    ProductName = i.ProductName,
                    Sku = i.Sku,
                    Quantity = i.Quantity,
                    SellingPrice = i.SellingPrice,
                    CostPriceAtSale = i.CostPriceAtSale,
                    Total = i.Total
                }).ToList(),
                Subtotal = s.Subtotal,
                TotalCostBasis = s.TotalCostBasis,
                TaxRate = s.TaxRate,
                TaxAmount = s.TaxAmount,
                Discount = s.Discount,
                GrandTotal = s.GrandTotal,
                GrossProfit = s.GrossProfit,
                PaymentMethod = s.PaymentMethod,
                Status = s.Status,
                Notes = s.Notes,
                CreatedAt = s.CreatedAt
            }).ToList();

            var mappedPurchases = purchases.Select(p => new PurchaseResponseDto
            {
                Id = p.Id,
                InvoiceNumber = p.InvoiceNumber,
                SupplierId = p.SupplierId,
                SupplierName = p.SupplierName,
                Items = p.Items.Select(i => new PurchaseItemResponseDto
                {
                    ProductId = i.ProductId,
                    ProductName = i.ProductName,
                    Sku = i.Sku,
                    Quantity = i.Quantity,
                    PurchasePrice = i.PurchasePrice,
                    Total = i.Total
                }).ToList(),
                Subtotal = p.Subtotal,
                TaxRate = p.TaxRate,
                TaxAmount = p.TaxAmount,
                Discount = p.Discount,
                GrandTotal = p.GrandTotal,
                PaymentMethod = p.PaymentMethod,
                Status = p.Status,
                Notes = p.Notes,
                CreatedAt = p.CreatedAt
            }).ToList();

            var result = new ReportSummaryDto
            {
                ProfitSummary = profitSummary,
                InventorySummary = inventorySummary,
                ProductBreakdown = productBreakdown,
                Sales = mappedSales,
                Purchases = mappedPurchases
            };

            return ApiResponse<ReportSummaryDto>.Ok(result);
        }
    }
}
