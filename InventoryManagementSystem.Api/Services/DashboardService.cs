using System.Globalization;
using InventoryManagementSystem.Api.DTOs;
using InventoryManagementSystem.Api.Repositories;

namespace InventoryManagementSystem.Api.Services
{
    public interface IDashboardService
    {
        Task<ApiResponse<DashboardSummaryDto>> GetSummaryAsync();
        Task<ApiResponse<List<MonthlySalesOverviewDto>>> GetSalesOverviewAsync();
    }

    public class DashboardService : IDashboardService
    {
        private readonly IProductRepository _productRepository;
        private readonly ICategoryRepository _categoryRepository;
        private readonly ISupplierRepository _supplierRepository;
        private readonly ISaleRepository _saleRepository;
        private readonly IPurchaseRepository _purchaseRepository;

        public DashboardService(
            IProductRepository productRepository,
            ICategoryRepository categoryRepository,
            ISupplierRepository supplierRepository,
            ISaleRepository saleRepository,
            IPurchaseRepository purchaseRepository)
        {
            _productRepository = productRepository;
            _categoryRepository = categoryRepository;
            _supplierRepository = supplierRepository;
            _saleRepository = saleRepository;
            _purchaseRepository = purchaseRepository;
        }

        public async Task<ApiResponse<DashboardSummaryDto>> GetSummaryAsync()
        {
            var productsTask = _productRepository.GetAllAsync();
            var categoriesTask = _categoryRepository.GetAllAsync();
            var suppliersTask = _supplierRepository.GetAllAsync();
            var salesTask = _saleRepository.GetAllAsync();
            var purchasesTask = _purchaseRepository.GetAllAsync();

            await Task.WhenAll(productsTask, categoriesTask, suppliersTask, salesTask, purchasesTask);

            var products = productsTask.Result;
            var categories = categoriesTask.Result;
            var suppliers = suppliersTask.Result;
            var sales = salesTask.Result;
            var purchases = purchasesTask.Result;

            var totalRevenue = sales.Sum(s => s.GrandTotal);
            var totalProcurementCost = purchases.Sum(p => p.GrandTotal);
            var totalCostBasis = sales.Sum(s => s.TotalCostBasis);
            var estimatedProfit = Math.Max(0m, sales.Sum(s => s.GrossProfit));
            var profitMargin = totalRevenue > 0 ? Math.Round((estimatedProfit / totalRevenue) * 100m, 1) : 0m;
            var availableStock = products.Sum(p => p.StockQuantity);

            // Recent Transactions (combine latest 5 sales + purchases)
            var recentSales = sales.Select(s => new RecentTransactionDto
            {
                Type = "SALE",
                Id = s.Id,
                InvoiceNumber = s.InvoiceNumber,
                PartyName = s.CustomerName,
                Amount = s.GrandTotal,
                Date = s.CreatedAt,
                Status = s.Status
            });

            var recentPurchases = purchases.Select(p => new RecentTransactionDto
            {
                Type = "PURCHASE",
                Id = p.Id,
                InvoiceNumber = p.InvoiceNumber,
                PartyName = p.SupplierName,
                Amount = p.GrandTotal,
                Date = p.CreatedAt,
                Status = p.Status
            });

            var recentTransactions = recentSales.Concat(recentPurchases)
                .OrderByDescending(t => t.Date)
                .Take(5)
                .ToList();

            // Low Stock Watchlist
            var lowStockAlerts = products
                .Where(p => p.StockQuantity <= p.MinStockLevel)
                .OrderBy(p => p.StockQuantity)
                .Take(5)
                .Select(p => new ProductResponseDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Sku = p.Sku,
                    Description = p.Description,
                    CategoryId = p.CategoryId,
                    CategoryName = p.CategoryName,
                    SupplierId = p.SupplierId,
                    SupplierName = p.SupplierName,
                    PurchasePrice = p.PurchasePrice,
                    SellingPrice = p.SellingPrice,
                    StockQuantity = p.StockQuantity,
                    MinStockLevel = p.MinStockLevel,
                    Unit = p.Unit,
                    ImageUrl = p.ImageUrl,
                    Status = p.Status,
                    CreatedAt = p.CreatedAt
                })
                .ToList();

            // Top Selling Products Breakdown
            var productSalesMap = new Dictionary<string, (string Name, string Sku, int Units, decimal Revenue, decimal Profit)>();
            foreach (var sale in sales)
            {
                foreach (var item in sale.Items)
                {
                    if (!productSalesMap.ContainsKey(item.ProductId))
                    {
                        productSalesMap[item.ProductId] = (item.ProductName, item.Sku, 0, 0m, 0m);
                    }

                    var cur = productSalesMap[item.ProductId];
                    var itemProfit = item.Total - (item.CostPriceAtSale * item.Quantity);
                    productSalesMap[item.ProductId] = (
                        cur.Name,
                        cur.Sku,
                        cur.Units + item.Quantity,
                        cur.Revenue + item.Total,
                        cur.Profit + Math.Max(0m, itemProfit)
                    );
                }
            }

            var topSelling = productSalesMap
                .Select(kv => new TopSellingProductDto
                {
                    ProductId = kv.Key,
                    ProductName = kv.Value.Name,
                    Sku = kv.Value.Sku,
                    UnitsSold = kv.Value.Units,
                    Revenue = kv.Value.Revenue,
                    GrossProfit = kv.Value.Profit
                })
                .OrderByDescending(p => p.Revenue)
                .Take(5)
                .ToList();

            var summary = new DashboardSummaryDto
            {
                TotalProducts = products.Count,
                TotalCategories = categories.Count,
                TotalSuppliers = suppliers.Count,
                TotalSalesCount = sales.Count,
                TotalPurchasesCount = purchases.Count,
                AvailableStockUnits = availableStock,
                TotalRevenue = totalRevenue,
                TotalProcurementCost = totalProcurementCost,
                EstimatedProfit = estimatedProfit,
                ProfitMarginPercentage = profitMargin,
                RecentTransactions = recentTransactions,
                LowStockAlerts = lowStockAlerts,
                TopSellingProducts = topSelling
            };

            return ApiResponse<DashboardSummaryDto>.Ok(summary);
        }

        public async Task<ApiResponse<List<MonthlySalesOverviewDto>>> GetSalesOverviewAsync()
        {
            var sales = await _saleRepository.GetAllAsync();
            var purchases = await _purchaseRepository.GetAllAsync();

            var months = new List<MonthlySalesOverviewDto>();
            var now = DateTime.UtcNow;

            for (int i = 5; i >= 0; i--)
            {
                var targetMonth = now.AddMonths(-i);
                var monthName = targetMonth.ToString("MMM", CultureInfo.InvariantCulture);
                var year = targetMonth.Year;

                var monthlySales = sales
                    .Where(s => s.CreatedAt.Year == year && s.CreatedAt.Month == targetMonth.Month)
                    .Sum(s => s.GrandTotal);

                var monthlyPurchases = purchases
                    .Where(p => p.CreatedAt.Year == year && p.CreatedAt.Month == targetMonth.Month)
                    .Sum(p => p.GrandTotal);

                months.Add(new MonthlySalesOverviewDto
                {
                    MonthName = monthName,
                    Year = year,
                    SalesAmount = monthlySales,
                    PurchasesAmount = monthlyPurchases
                });
            }

            return ApiResponse<List<MonthlySalesOverviewDto>>.Ok(months);
        }
    }
}
