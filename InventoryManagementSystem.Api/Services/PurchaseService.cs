using InventoryManagementSystem.Api.Data;
using InventoryManagementSystem.Api.DTOs;
using InventoryManagementSystem.Api.Models;
using InventoryManagementSystem.Api.Repositories;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace InventoryManagementSystem.Api.Services
{
    public interface IPurchaseService
    {
        Task<ApiResponse<List<PurchaseResponseDto>>> GetAllAsync(string? supplierId = null);
        Task<ApiResponse<PurchaseResponseDto>> GetByIdAsync(string id);
        Task<ApiResponse<PurchaseResponseDto>> CreateAsync(PurchaseCreateDto dto);
    }

    public class PurchaseService : IPurchaseService
    {
        private readonly IMongoDbContext _context;
        private readonly IPurchaseRepository _purchaseRepository;
        private readonly IProductRepository _productRepository;
        private readonly ISupplierRepository _supplierRepository;
        private readonly IStockTransactionRepository _stockTransactionRepository;
        private readonly ILogger<PurchaseService> _logger;

        public PurchaseService(
            IMongoDbContext context,
            IPurchaseRepository purchaseRepository,
            IProductRepository productRepository,
            ISupplierRepository supplierRepository,
            IStockTransactionRepository stockTransactionRepository,
            ILogger<PurchaseService> logger)
        {
            _context = context;
            _purchaseRepository = purchaseRepository;
            _productRepository = productRepository;
            _supplierRepository = supplierRepository;
            _stockTransactionRepository = stockTransactionRepository;
            _logger = logger;
        }

        public async Task<ApiResponse<List<PurchaseResponseDto>>> GetAllAsync(string? supplierId = null)
        {
            var purchases = !string.IsNullOrWhiteSpace(supplierId)
                ? await _purchaseRepository.GetBySupplierIdAsync(supplierId)
                : await _purchaseRepository.GetAllAsync();
            var dtos = purchases.Select(MapToResponse).ToList();
            return ApiResponse<List<PurchaseResponseDto>>.Ok(dtos);
        }

        public async Task<ApiResponse<PurchaseResponseDto>> GetByIdAsync(string id)
        {
            var purchase = await _purchaseRepository.GetByIdAsync(id);
            if (purchase == null)
                return ApiResponse<PurchaseResponseDto>.Fail("Purchase invoice not found.");

            return ApiResponse<PurchaseResponseDto>.Ok(MapToResponse(purchase));
        }

        public async Task<ApiResponse<PurchaseResponseDto>> CreateAsync(PurchaseCreateDto dto)
        {
            if (dto.Items == null || dto.Items.Count == 0)
                return ApiResponse<PurchaseResponseDto>.Fail("Purchase invoice must contain at least one item.");

            var supplier = await _supplierRepository.GetByIdAsync(dto.SupplierId);
            if (supplier == null)
                return ApiResponse<PurchaseResponseDto>.Fail("Selected supplier does not exist.");

            var invoiceNumber = string.IsNullOrWhiteSpace(dto.InvoiceNumber)
                ? $"PUR-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}"
                : dto.InvoiceNumber.Trim();

            var existingInvoice = await _purchaseRepository.GetByInvoiceNumberAsync(invoiceNumber);
            if (existingInvoice != null)
                return ApiResponse<PurchaseResponseDto>.Fail($"Purchase invoice number '{invoiceNumber}' already exists.");

            // 1. Validate all products and calculate line totals on the server
            var validatedItems = new List<PurchaseItem>();
            var productMap = new Dictionary<string, Product>();
            var productList = new List<Product>();
            decimal subtotal = 0m;

            foreach (var itemDto in dto.Items)
            {
                if (itemDto.Quantity <= 0)
                    return ApiResponse<PurchaseResponseDto>.Fail($"Quantity for product {itemDto.ProductId} must be greater than zero.");

                if (itemDto.PurchasePrice <= 0)
                    return ApiResponse<PurchaseResponseDto>.Fail($"Purchase price for product {itemDto.ProductId} must be positive.");

                if (!productMap.TryGetValue(itemDto.ProductId, out var product))
                {
                    product = await _productRepository.GetByIdAsync(itemDto.ProductId);
                    if (product == null)
                        return ApiResponse<PurchaseResponseDto>.Fail($"Product with ID '{itemDto.ProductId}' was not found.");
                    productMap[itemDto.ProductId] = product;
                }

                var lineTotal = itemDto.Quantity * itemDto.PurchasePrice;
                subtotal += lineTotal;

                validatedItems.Add(new PurchaseItem
                {
                    ProductId = product.Id,
                    ProductName = product.Name,
                    Sku = product.Sku,
                    Quantity = itemDto.Quantity,
                    PurchasePrice = itemDto.PurchasePrice,
                    Total = lineTotal
                });

                productList.Add(product);
            }

            // Server-side tax and grand total calculation
            var taxRate = Math.Clamp(dto.TaxRate, 0m, 28m);
            var taxAmount = Math.Round((subtotal * taxRate) / 100m, 2);
            var discount = Math.Max(0m, dto.Discount);
            if (discount > subtotal + taxAmount)
                return ApiResponse<PurchaseResponseDto>.Fail("Discount cannot exceed the purchase invoice total.");
            var grandTotal = Math.Max(0m, subtotal + taxAmount - discount);

            var purchase = new Purchase
            {
                InvoiceNumber = invoiceNumber,
                SupplierId = supplier.Id,
                SupplierName = supplier.Company,
                Items = validatedItems,
                Subtotal = subtotal,
                TaxRate = taxRate,
                TaxAmount = taxAmount,
                Discount = discount,
                GrandTotal = grandTotal,
                PaymentMethod = string.IsNullOrWhiteSpace(dto.PaymentMethod) ? "Bank Transfer" : dto.PaymentMethod.Trim(),
                Status = "Completed",
                Notes = (dto.Notes ?? string.Empty).Trim(),
                CreatedAt = DateTime.UtcNow
            };

            var runningStock = productMap.ToDictionary(kvp => kvp.Key, kvp => kvp.Value.StockQuantity);

            // 2. Multi-document transaction with compensation fallback
            var session = await _context.StartSessionAsync();

            if (session != null)
            {
                try
                {
                    session.StartTransaction();

                    await _purchaseRepository.CreateAsync(purchase, session);

                    for (int i = 0; i < validatedItems.Count; i++)
                    {
                        var item = validatedItems[i];
                        var prod = productList[i];
                        var prevStock = runningStock[prod.Id];
                        var newStock = prevStock + item.Quantity;
                        runningStock[prod.Id] = newStock;

                        await _productRepository.UpdateStockAtomicAsync(prod.Id, item.Quantity, session);
                        await _productRepository.UpdatePurchasePriceAsync(prod.Id, item.PurchasePrice, session);

                        await _stockTransactionRepository.CreateAsync(new StockTransaction
                        {
                            ProductId = prod.Id,
                            ProductName = prod.Name,
                            Sku = prod.Sku,
                            Type = "PURCHASE",
                            Quantity = item.Quantity,
                            PreviousStock = prevStock,
                            NewStock = newStock,
                            ReferenceId = invoiceNumber,
                            Notes = $"Inward purchase consignment from {supplier.Company}",
                            Timestamp = DateTime.UtcNow
                        }, session);
                    }

                    await session.CommitTransactionAsync();
                    _logger.LogInformation("Purchase order {InvoiceNumber} committed via MongoDB Atlas transaction.", invoiceNumber);
                }
                catch (Exception ex)
                {
                    await session.AbortTransactionAsync();
                    _logger.LogError(ex, "Transaction aborted for purchase order {InvoiceNumber}", invoiceNumber);
                    return ApiResponse<PurchaseResponseDto>.Fail("Failed to process purchase transaction: " + ex.Message);
                }
                finally
                {
                    session.Dispose();
                }
            }
            else
            {
                _logger.LogWarning("MongoDB standalone detected. Executing sequential operations for purchase {InvoiceNumber}.", invoiceNumber);

                await _purchaseRepository.CreateAsync(purchase);

                for (int i = 0; i < validatedItems.Count; i++)
                {
                    var item = validatedItems[i];
                    var prod = productList[i];
                    var prevStock = runningStock[prod.Id];
                    var newStock = prevStock + item.Quantity;
                    runningStock[prod.Id] = newStock;

                    await _productRepository.UpdateStockAtomicAsync(prod.Id, item.Quantity);
                    await _productRepository.UpdatePurchasePriceAsync(prod.Id, item.PurchasePrice);

                    await _stockTransactionRepository.CreateAsync(new StockTransaction
                    {
                        ProductId = prod.Id,
                        ProductName = prod.Name,
                        Sku = prod.Sku,
                        Type = "PURCHASE",
                        Quantity = item.Quantity,
                        PreviousStock = prevStock,
                        NewStock = newStock,
                        ReferenceId = invoiceNumber,
                        Notes = $"Inward purchase consignment from {supplier.Company}",
                        Timestamp = DateTime.UtcNow
                    });
                }
            }

            return ApiResponse<PurchaseResponseDto>.Ok(MapToResponse(purchase), "Purchase invoice created and stock increased successfully.");
        }

        private static PurchaseResponseDto MapToResponse(Purchase p) => new()
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
        };
    }
}
