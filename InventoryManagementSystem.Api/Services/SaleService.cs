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

            var invoiceNumber = string.IsNullOrWhiteSpace(dto.InvoiceNumber)
                ? $"INV-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}"
                : dto.InvoiceNumber.Trim();

            var existingInvoice = await _saleRepository.GetByInvoiceNumberAsync(invoiceNumber);
            if (existingInvoice != null)
                return ApiResponse<SaleResponseDto>.Fail($"Sales invoice number '{invoiceNumber}' already exists.");

            // 1. Verify available stock (aggregated across duplicate product lines) and calculate cost basis on the server
            var validatedItems = new List<SaleItem>();
            var productMap = new Dictionary<string, Product>();
            var requestedQtyByProduct = new Dictionary<string, int>();
            var productList = new List<Product>();
            decimal subtotal = 0m;
            decimal totalCostBasis = 0m;

            foreach (var itemDto in dto.Items)
            {
                if (itemDto.Quantity <= 0)
                    return ApiResponse<SaleResponseDto>.Fail($"Quantity for product {itemDto.ProductId} must be at least 1.");

                if (itemDto.CustomSellingPrice.HasValue && itemDto.CustomSellingPrice.Value <= 0)
                    return ApiResponse<SaleResponseDto>.Fail($"Custom selling price for product {itemDto.ProductId} must be greater than zero.");

                if (!productMap.TryGetValue(itemDto.ProductId, out var product))
                {
                    product = await _productRepository.GetByIdAsync(itemDto.ProductId);
                    if (product == null)
                        return ApiResponse<SaleResponseDto>.Fail($"Product with ID '{itemDto.ProductId}' was not found.");
                    productMap[itemDto.ProductId] = product;
                }

                var aggregateQty = requestedQtyByProduct.GetValueOrDefault(itemDto.ProductId, 0) + itemDto.Quantity;
                requestedQtyByProduct[itemDto.ProductId] = aggregateQty;

                // STRICT STOCK CHECK: Verify aggregated available stock before processing
                if (product.StockQuantity < aggregateQty)
                {
                    return ApiResponse<SaleResponseDto>.Fail(
                        $"Insufficient stock for '{product.Name}'. Available inventory: {product.StockQuantity} units, Total Requested: {aggregateQty} units."
                    );
                }

                var effectivePrice = itemDto.CustomSellingPrice ?? product.SellingPrice;

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
                    CostPriceAtSale = product.PurchasePrice, // Saved cost basis for profit reports
                    Total = lineTotal
                });

                productList.Add(product);
            }

            // Server-side tax and profit calculations
            var taxRate = Math.Clamp(dto.TaxRate, 0m, 28m);
            var taxAmount = Math.Round((subtotal * taxRate) / 100m, 2);
            var discount = Math.Max(0m, dto.Discount);
            if (discount > subtotal + taxAmount)
                return ApiResponse<SaleResponseDto>.Fail("Discount cannot exceed the sales invoice total.");
            var grandTotal = Math.Max(0m, subtotal + taxAmount - discount);
            var grossProfit = Math.Max(0m, subtotal - discount - totalCostBasis);

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
                PaymentMethod = string.IsNullOrWhiteSpace(dto.PaymentMethod) ? "UPI" : dto.PaymentMethod.Trim(),
                Status = "Completed",
                Notes = dto.Notes?.Trim() ?? string.Empty,
                CreatedAt = DateTime.UtcNow
            };

            var runningStock = productMap.ToDictionary(kvp => kvp.Key, kvp => kvp.Value.StockQuantity);

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

                        var previousStock = runningStock[prod.Id];
                        var newStock = previousStock - item.Quantity;
                        runningStock[prod.Id] = newStock;

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
                        foreach (var dec in decrementedProducts)
                        {
                            await _productRepository.UpdateStockAtomicAsync(dec.ProductId, dec.Qty);
                        }
                        return ApiResponse<SaleResponseDto>.Fail($"Failed to process sale: Insufficient stock or concurrent order on '{item.ProductName}'.");
                    }
                    decrementedProducts.Add((item.ProductId, item.Quantity));
                }

                await _saleRepository.CreateAsync(sale);

                for (int i = 0; i < validatedItems.Count; i++)
                {
                    var item = validatedItems[i];
                    var prod = productList[i];
                    var prevStock = runningStock[prod.Id];
                    var newStock = prevStock - item.Quantity;
                    runningStock[prod.Id] = newStock;

                    await _stockTransactionRepository.CreateAsync(new StockTransaction
                    {
                        ProductId = prod.Id,
                        ProductName = prod.Name,
                        Sku = prod.Sku,
                        Type = "SALE",
                        Quantity = -item.Quantity,
                        PreviousStock = prevStock,
                        NewStock = newStock,
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
