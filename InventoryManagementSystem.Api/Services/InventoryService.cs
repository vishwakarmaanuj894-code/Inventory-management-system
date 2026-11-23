using InventoryManagementSystem.Api.DTOs;
using InventoryManagementSystem.Api.Models;
using InventoryManagementSystem.Api.Repositories;

namespace InventoryManagementSystem.Api.Services
{
    public interface IInventoryService
    {
        Task<ApiResponse<StockOverviewDto>> GetStockOverviewAsync();
        Task<ApiResponse<List<ProductResponseDto>>> GetLowStockAsync();
        Task<ApiResponse<List<StockTransactionResponseDto>>> GetTransactionsAsync(int limit = 200);
        Task<ApiResponse<StockTransactionResponseDto>> AdjustStockAsync(StockAdjustmentDto dto);
    }

    public class InventoryService : IInventoryService
    {
        private readonly IProductRepository _productRepository;
        private readonly IStockTransactionRepository _transactionRepository;

        public InventoryService(
            IProductRepository productRepository,
            IStockTransactionRepository transactionRepository)
        {
            _productRepository = productRepository;
            _transactionRepository = transactionRepository;
        }

        public async Task<ApiResponse<StockOverviewDto>> GetStockOverviewAsync()
        {
            var products = await _productRepository.GetAllAsync();

            var overview = new StockOverviewDto
            {
                TotalItems = products.Count,
                InStockCount = products.Count(p => p.Status == "in_stock"),
                LowStockCount = products.Count(p => p.Status == "low_stock"),
                OutOfStockCount = products.Count(p => p.Status == "out_of_stock"),
                TotalUnitsOnHand = products.Sum(p => p.StockQuantity),
                TotalValuationAtCost = products.Sum(p => p.StockQuantity * p.PurchasePrice),
                TotalValuationAtRetail = products.Sum(p => p.StockQuantity * p.SellingPrice)
            };

            return ApiResponse<StockOverviewDto>.Ok(overview);
        }

        public async Task<ApiResponse<List<ProductResponseDto>>> GetLowStockAsync()
        {
            var products = await _productRepository.GetLowStockAsync();
            var dtos = products.Select(p => new ProductResponseDto
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
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt
            }).ToList();

            return ApiResponse<List<ProductResponseDto>>.Ok(dtos);
        }

        public async Task<ApiResponse<List<StockTransactionResponseDto>>> GetTransactionsAsync(int limit = 200)
        {
            var txs = await _transactionRepository.GetAllAsync(limit);
            var dtos = txs.Select(t => new StockTransactionResponseDto
            {
                Id = t.Id,
                ProductId = t.ProductId,
                ProductName = t.ProductName,
                Sku = t.Sku,
                Type = t.Type,
                Quantity = t.Quantity,
                PreviousStock = t.PreviousStock,
                NewStock = t.NewStock,
                ReferenceId = t.ReferenceId,
                Notes = t.Notes,
                Timestamp = t.Timestamp
            }).ToList();

            return ApiResponse<List<StockTransactionResponseDto>>.Ok(dtos);
        }

        public async Task<ApiResponse<StockTransactionResponseDto>> AdjustStockAsync(StockAdjustmentDto dto)
        {
            var product = await _productRepository.GetByIdAsync(dto.ProductId);
            if (product == null)
                return ApiResponse<StockTransactionResponseDto>.Fail("Product not found.");

            // STRICT AUDIT: Reason is mandatory
            if (string.IsNullOrWhiteSpace(dto.Reason))
                return ApiResponse<StockTransactionResponseDto>.Fail("Reason for stock adjustment is required for audit compliance.");

            var prevStock = product.StockQuantity;
            int newStock;
            string txType;
            int delta;

            switch (dto.AdjustmentType.ToLowerInvariant())
            {
                case "add":
                    if (dto.Quantity <= 0)
                        return ApiResponse<StockTransactionResponseDto>.Fail("Adjustment quantity must be greater than zero.");
                    delta = dto.Quantity;
                    newStock = prevStock + delta;
                    txType = "ADJUSTMENT_ADD";
                    break;

                case "subtract":
                    if (dto.Quantity <= 0)
                        return ApiResponse<StockTransactionResponseDto>.Fail("Adjustment quantity must be greater than zero.");

                    // STRICT REQUIREMENT: Never allow negative stock
                    if (prevStock < dto.Quantity)
                    {
                        return ApiResponse<StockTransactionResponseDto>.Fail(
                            $"Cannot subtract {dto.Quantity} units. Current available stock is only {prevStock} units. Negative stock is strictly prohibited."
                        );
                    }
                    delta = -dto.Quantity;
                    newStock = prevStock + delta;
                    txType = "ADJUSTMENT_SUBTRACT";
                    break;

                case "set":
                    if (dto.Quantity < 0)
                        return ApiResponse<StockTransactionResponseDto>.Fail("Physical inventory count cannot be negative.");
                    delta = dto.Quantity - prevStock;
                    newStock = dto.Quantity;
                    txType = delta >= 0 ? "ADJUSTMENT_ADD" : "ADJUSTMENT_SUBTRACT";
                    break;

                default:
                    return ApiResponse<StockTransactionResponseDto>.Fail("Invalid adjustment type. Use 'add', 'subtract', or 'set'.");
            }

            // Update product stock and status
            product.StockQuantity = newStock;
            product.RecalculateStatus();
            product.UpdatedAt = DateTime.UtcNow;

            await _productRepository.UpdateAsync(product);

            // Log immutable audit transaction
            var transaction = new StockTransaction
            {
                ProductId = product.Id,
                ProductName = product.Name,
                Sku = product.Sku,
                Type = txType,
                Quantity = delta,
                PreviousStock = prevStock,
                NewStock = newStock,
                ReferenceId = dto.Reason.Trim(),
                Notes = dto.Notes?.Trim() ?? string.Empty,
                Timestamp = DateTime.UtcNow
            };

            await _transactionRepository.CreateAsync(transaction);

            return ApiResponse<StockTransactionResponseDto>.Ok(new StockTransactionResponseDto
            {
                Id = transaction.Id,
                ProductId = transaction.ProductId,
                ProductName = transaction.ProductName,
                Sku = transaction.Sku,
                Type = transaction.Type,
                Quantity = transaction.Quantity,
                PreviousStock = transaction.PreviousStock,
                NewStock = transaction.NewStock,
                ReferenceId = transaction.ReferenceId,
                Notes = transaction.Notes,
                Timestamp = transaction.Timestamp
            }, "Stock adjustment recorded successfully.");
        }
    }
}
