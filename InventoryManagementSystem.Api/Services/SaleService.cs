using InventoryManagementSystem.Api.Data;
using InventoryManagementSystem.Api.DTOs;
using InventoryManagementSystem.Api.Models;
using InventoryManagementSystem.Api.Repositories;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace InventoryManagementSystem.Api.Services
{
    public interface ISaleService
    {
        Task<ApiResponse<List<SaleResponseDto>>> GetAllAsync();
        Task<ApiResponse<SaleResponseDto>> GetByIdAsync(string id);
        Task<ApiResponse<SaleResponseDto>> CreateAsync(SaleCreateDto dto);
    }

    public class SaleService : ISaleService
    {
        private readonly IMongoDbContext _context;
        private readonly ISaleRepository _saleRepository;
        private readonly IProductRepository _productRepository;
        private readonly IStockTransactionRepository _stockTransactionRepository;
        private readonly ILogger<SaleService> _logger;

        public SaleService(
            IMongoDbContext context,
            ISaleRepository saleRepository,
            IProductRepository productRepository,
            IStockTransactionRepository stockTransactionRepository,
            ILogger<SaleService> logger)
        {
            _context = context;
            _saleRepository = saleRepository;
            _productRepository = productRepository;
            _stockTransactionRepository = stockTransactionRepository;
            _logger = logger;
        }

        public async Task<ApiResponse<List<SaleResponseDto>>> GetAllAsync()
        {
            var sales = await _saleRepository.GetAllAsync();
            var dtos = sales.Select(MapToResponse).ToList();
            return ApiResponse<List<SaleResponseDto>>.Ok(dtos);
        }

        public async Task<ApiResponse<SaleResponseDto>> GetByIdAsync(string id)
        {
            var sale = await _saleRepository.GetByIdAsync(id);
            if (sale == null)
                return ApiResponse<SaleResponseDto>.Fail("Sales invoice not found.");

            return ApiResponse<SaleResponseDto>.Ok(MapToResponse(sale));
        }

        public async Task<ApiResponse<SaleResponseDto>> CreateAsync(SaleCreateDto dto)
        {
            if (dto.Items == null || dto.Items.Count == 0)
                return ApiResponse<SaleResponseDto>.Fail("Sales invoice must contain at least one item.");

            // 1. Verify available stock and calculate cost basis on the server
            var validatedItems = new List<SaleItem>();
            var productList = new List<Product>();
            decimal subtotal = 0m;
            decimal totalCostBasis = 0m;

            foreach (var itemDto in dto.Items)
            {
                if (itemDto.Quantity <= 0)
                    return ApiResponse<SaleResponseDto>.Fail($"Quantity for product {itemDto.ProductId} must be at least 1.");

                var product = await _productRepository.GetByIdAsync(itemDto.ProductId);
                if (product == null)
                    return ApiResponse<SaleResponseDto>.Fail($"Product with ID '{itemDto.ProductId}' was not found.");

                // STRICT STOCK CHECK: Verify available stock before processing
                if (product.StockQuantity < itemDto.Quantity)
                {
                    return ApiResponse<SaleResponseDto>.Fail(
                        $"Insufficient stock for '{product.Name}'. Available inventory: {product.StockQuantity} units, Requested: {itemDto.Quantity} units."
                    );
                }

                // Server enforces catalog selling price unless valid custom price provided
                var effectivePrice = itemDto.CustomSellingPrice.HasValue && itemDto.CustomSellingPrice.Value > 0
                    ? itemDto.CustomSellingPrice.Value
                    : product.SellingPrice;

                var lineTotal = effectivePrice * itemDto.Quantity;
                var lineCostBasis = product.PurchasePrice * itemDto.Quantity;

                subtotal += lineTotal;
                totalCostBasis += lineCostBasis;

                validatedItems.Add(new SaleItem
                {
                    ProductId = product.Id,
                    ProductName = product.Name,
                    Sku = product.Sku,
                    Quantity = itemDto.Quantity,
                    SellingPrice = effectivePrice,
                    CostPriceAtSale = product.PurchasePrice, // Saved cost basis for profit reports!
                    Total = lineTotal
                });

                productList.Add(product);
            }

            // Server-side tax and profit calculations
            var taxRate = Math.Clamp(dto.TaxRate, 0m, 28m);
            var taxAmount = Math.Round((subtotal * taxRate) / 100m, 2);
            var discount = Math.Max(0m, dto.Discount);
            var grandTotal = Math.Max(0m, subtotal + taxAmount - discount);
            var grossProfit = Math.Max(0m, subtotal - discount - totalCostBasis);

            var invoiceNumber = string.IsNullOrWhiteSpace(dto.InvoiceNumber)
                ? $"INV-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}"
                : dto.InvoiceNumber.Trim();

            var sale = new Sale
            {
                InvoiceNumber = invoiceNumber,
                CustomerName = string.IsNullOrWhiteSpace(dto.CustomerName) ? "Walk-in Customer" : dto.CustomerName.Trim(),
                CustomerPhone = dto.CustomerPhone?.Trim() ?? string.Empty,
                CustomerEmail = dto.CustomerEmail?.Trim() ?? string.Empty,
                Items = validatedItems,
                Subtotal = subtotal,
                TotalCostBasis = totalCostBasis,
                TaxRate = taxRate,
                TaxAmount = taxAmount,
                Discount = discount,
                GrandTotal = grandTotal,
                GrossProfit = grossProfit,
                PaymentMethod = string.IsNullOrWhiteSpace(dto.PaymentMethod) ? "UPI" : dto.PaymentMethod,
                Status = "Completed",
                Notes = dto.Notes?.Trim() ?? string.Empty,
                CreatedAt = DateTime.UtcNow
            };

            // 2. Concurrency-safe atomic stock decrement
            var session = await _context.StartSessionAsync();

            if (session != null)
            {
                try
                {
                    session.StartTransaction();

                    // Re-verify and decrement stock atomically within transaction
                    for (int i = 0; i < validatedItems.Count; i++)
                    {
                        var item = validatedItems[i];
                        var prod = productList[i];

                        var updated = await _productRepository.UpdateStockAtomicAsync(prod.Id, -item.Quantity, session);
                        if (!updated)
                        {
                            throw new InvalidOperationException($"Concurrency conflict: Stock for '{prod.Name}' was modified concurrently or became insufficient.");
                        }

                        var previousStock = prod.StockQuantity;
                        var newStock = previousStock - item.Quantity;

                        await _stockTransactionRepository.CreateAsync(new StockTransaction
                        {
                            ProductId = prod.Id,
                            ProductName = prod.Name,
                            Sku = prod.Sku,
                            Type = "SALE",
                            Quantity = -item.Quantity,
                            PreviousStock = previousStock,
                            NewStock = newStock,
                            ReferenceId = invoiceNumber,
                            Notes = $"Customer sale invoice to {sale.CustomerName}",
                            Timestamp = DateTime.UtcNow
                        }, session);
                    }

                    await _saleRepository.CreateAsync(sale, session);
                    await session.CommitTransactionAsync();
                }
                catch (Exception ex)
                {
                    await session.AbortTransactionAsync();
                    _logger.LogError(ex, "Transaction aborted for sales invoice {InvoiceNumber}", invoiceNumber);
                    return ApiResponse<SaleResponseDto>.Fail("Sale processing halted: " + ex.Message);
                }
                finally
                {
                    session.Dispose();
                }
            }
            else
            {
                // Standalone fallback: Atomic conditional decrement with rollback on failure
                var decrementedProducts = new List<(string ProductId, int Qty)>();

                for (int i = 0; i < validatedItems.Count; i++)
                {
                    var item = validatedItems[i];
                    var success = await _productRepository.UpdateStockAtomicAsync(item.ProductId, -item.Quantity);
                    if (!success)
                    {
                        // Rollback already decremented products
                        foreach (var dec in decrementedProducts)
                        {
                            await _productRepository.UpdateStockAtomicAsync(dec.ProductId, dec.Qty);
                        }
                        return ApiResponse<SaleResponseDto>.Fail($"Failed to process sale: Insufficient stock or concurrent order on '{item.ProductName}'.");
                    }
                    decrementedProducts.Add((item.ProductId, item.Quantity));
                }

                // If all atomic decrements succeeded, write the sale record and transactions
                await _saleRepository.CreateAsync(sale);

                for (int i = 0; i < validatedItems.Count; i++)
                {
                    var item = validatedItems[i];
                    var prod = productList[i];
                    var prevStock = prod.StockQuantity;

                    await _stockTransactionRepository.CreateAsync(new StockTransaction
                    {
                        ProductId = prod.Id,
                        ProductName = prod.Name,
                        Sku = prod.Sku,
                        Type = "SALE",
                        Quantity = -item.Quantity,
                        PreviousStock = prevStock,
                        NewStock = prevStock - item.Quantity,
                        ReferenceId = invoiceNumber,
                        Notes = $"Customer sale invoice to {sale.CustomerName}",
                        Timestamp = DateTime.UtcNow
                    });
                }
            }

            return ApiResponse<SaleResponseDto>.Ok(MapToResponse(sale), "Sale completed successfully and inventory deducted.");
        }

        private static SaleResponseDto MapToResponse(Sale s) => new()
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
        };
    }
}
