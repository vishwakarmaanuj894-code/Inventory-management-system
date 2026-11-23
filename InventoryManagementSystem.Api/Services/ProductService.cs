using InventoryManagementSystem.Api.DTOs;
using InventoryManagementSystem.Api.Models;
using InventoryManagementSystem.Api.Repositories;

namespace InventoryManagementSystem.Api.Services
{
    public interface IProductService
    {
        Task<ApiResponse<List<ProductResponseDto>>> GetAllAsync(ProductFilterDto filter);
        Task<ApiResponse<ProductResponseDto>> GetByIdAsync(string id);
        Task<ApiResponse<ProductResponseDto>> CreateAsync(ProductCreateDto dto);
        Task<ApiResponse<ProductResponseDto>> UpdateAsync(string id, ProductUpdateDto dto);
        Task<ApiResponse<bool>> DeleteAsync(string id);
    }

    public class ProductService : IProductService
    {
        private readonly IProductRepository _productRepository;
        private readonly ICategoryRepository _categoryRepository;
        private readonly ISupplierRepository _supplierRepository;
        private readonly IStockTransactionRepository _stockTransactionRepository;

        public ProductService(
            IProductRepository productRepository,
            ICategoryRepository categoryRepository,
            ISupplierRepository supplierRepository,
            IStockTransactionRepository stockTransactionRepository)
        {
            _productRepository = productRepository;
            _categoryRepository = categoryRepository;
            _supplierRepository = supplierRepository;
            _stockTransactionRepository = stockTransactionRepository;
        }

        public async Task<ApiResponse<List<ProductResponseDto>>> GetAllAsync(ProductFilterDto filter)
        {
            var products = await _productRepository.GetAllAsync(filter.Search, filter.CategoryId, filter.Status);
            var dtos = products.Select(MapToResponse).ToList();
            return ApiResponse<List<ProductResponseDto>>.Ok(dtos);
        }

        public async Task<ApiResponse<ProductResponseDto>> GetByIdAsync(string id)
        {
            var product = await _productRepository.GetByIdAsync(id);
            if (product == null)
                return ApiResponse<ProductResponseDto>.Fail("Product not found.");

            return ApiResponse<ProductResponseDto>.Ok(MapToResponse(product));
        }

        public async Task<ApiResponse<ProductResponseDto>> CreateAsync(ProductCreateDto dto)
        {
            // 1. Prevent duplicate SKU
            var existingSku = await _productRepository.GetBySkuAsync(dto.Sku.Trim());
            if (existingSku != null)
            {
                return ApiResponse<ProductResponseDto>.Fail($"A product with SKU '{dto.Sku}' already exists.");
            }

            // 2. Validate category
            var category = await _categoryRepository.GetByIdAsync(dto.CategoryId);
            if (category == null)
            {
                return ApiResponse<ProductResponseDto>.Fail("Specified category does not exist.");
            }

            // 3. Validate supplier
            var supplier = await _supplierRepository.GetByIdAsync(dto.SupplierId);
            if (supplier == null)
            {
                return ApiResponse<ProductResponseDto>.Fail("Specified supplier does not exist.");
            }

            var product = new Product
            {
                Name = dto.Name.Trim(),
                Sku = dto.Sku.Trim().ToUpperInvariant(),
                Description = dto.Description.Trim(),
                CategoryId = category.Id,
                CategoryName = category.Name,
                SupplierId = supplier.Id,
                SupplierName = supplier.Company,
                PurchasePrice = dto.PurchasePrice,
                SellingPrice = dto.SellingPrice,
                StockQuantity = dto.StockQuantity,
                MinStockLevel = dto.MinStockLevel,
                Unit = string.IsNullOrWhiteSpace(dto.Unit) ? "pcs" : dto.Unit.Trim(),
                ImageUrl = string.IsNullOrWhiteSpace(dto.ImageUrl)
                    ? "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=150&auto=format&fit=crop&q=80"
                    : dto.ImageUrl.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            product.RecalculateStatus();
            await _productRepository.CreateAsync(product);

            // Log initial stock movement if quantity > 0
            if (product.StockQuantity > 0)
            {
                await _stockTransactionRepository.CreateAsync(new StockTransaction
                {
                    ProductId = product.Id,
                    ProductName = product.Name,
                    Sku = product.Sku,
                    Type = "ADJUSTMENT_ADD",
                    Quantity = product.StockQuantity,
                    PreviousStock = 0,
                    NewStock = product.StockQuantity,
                    ReferenceId = "Initial Stock",
                    Notes = "Initial inventory stock setup",
                    Timestamp = DateTime.UtcNow
                });
            }

            return ApiResponse<ProductResponseDto>.Ok(MapToResponse(product), "Product created successfully.");
        }

        public async Task<ApiResponse<ProductResponseDto>> UpdateAsync(string id, ProductUpdateDto dto)
        {
            var product = await _productRepository.GetByIdAsync(id);
            if (product == null)
                return ApiResponse<ProductResponseDto>.Fail("Product not found.");

            // Prevent SKU collision
            var trimmedSku = dto.Sku.Trim().ToUpperInvariant();
            if (!string.Equals(product.Sku, trimmedSku, StringComparison.OrdinalIgnoreCase))
            {
                var existingSku = await _productRepository.GetBySkuAsync(trimmedSku);
                if (existingSku != null && existingSku.Id != id)
                {
                    return ApiResponse<ProductResponseDto>.Fail($"SKU '{dto.Sku}' is already assigned to another product.");
                }
            }

            var category = await _categoryRepository.GetByIdAsync(dto.CategoryId);
            if (category == null)
                return ApiResponse<ProductResponseDto>.Fail("Specified category does not exist.");

            var supplier = await _supplierRepository.GetByIdAsync(dto.SupplierId);
            if (supplier == null)
                return ApiResponse<ProductResponseDto>.Fail("Specified supplier does not exist.");

            product.Name = dto.Name.Trim();
            product.Sku = trimmedSku;
            product.Description = dto.Description.Trim();
            product.CategoryId = category.Id;
            product.CategoryName = category.Name;
            product.SupplierId = supplier.Id;
            product.SupplierName = supplier.Company;
            product.PurchasePrice = dto.PurchasePrice;
            product.SellingPrice = dto.SellingPrice;
            product.StockQuantity = dto.StockQuantity;
            product.MinStockLevel = dto.MinStockLevel;
            product.Unit = dto.Unit.Trim();
            product.ImageUrl = dto.ImageUrl;
            product.UpdatedAt = DateTime.UtcNow;

            product.RecalculateStatus();
            await _productRepository.UpdateAsync(product);

            return ApiResponse<ProductResponseDto>.Ok(MapToResponse(product), "Product updated successfully.");
        }

        public async Task<ApiResponse<bool>> DeleteAsync(string id)
        {
            var product = await _productRepository.GetByIdAsync(id);
            if (product == null)
                return ApiResponse<bool>.Fail("Product not found.");

            var deleted = await _productRepository.DeleteAsync(id);
            return ApiResponse<bool>.Ok(deleted, "Product deleted successfully.");
        }

        private static ProductResponseDto MapToResponse(Product p) => new()
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
        };
    }
}
