using InventoryManagementSystem.Api.DTOs;
using InventoryManagementSystem.Api.Models;
using InventoryManagementSystem.Api.Repositories;

namespace InventoryManagementSystem.Api.Services
{
    public interface ICategoryService
    {
        Task<ApiResponse<List<CategoryResponseDto>>> GetAllAsync();
        Task<ApiResponse<CategoryResponseDto>> GetByIdAsync(string id);
        Task<ApiResponse<CategoryResponseDto>> CreateAsync(CategoryCreateDto dto);
        Task<ApiResponse<CategoryResponseDto>> UpdateAsync(string id, CategoryUpdateDto dto);
        Task<ApiResponse<bool>> DeleteAsync(string id);
    }

    public class CategoryService : ICategoryService
    {
        private readonly ICategoryRepository _categoryRepository;
        private readonly IProductRepository _productRepository;

        public CategoryService(ICategoryRepository categoryRepository, IProductRepository productRepository)
        {
            _categoryRepository = categoryRepository;
            _productRepository = productRepository;
        }

        public async Task<ApiResponse<List<CategoryResponseDto>>> GetAllAsync()
        {
            var categories = await _categoryRepository.GetAllAsync();
            var dtos = new List<CategoryResponseDto>();

            foreach (var cat in categories)
            {
                var count = await _productRepository.CountByCategoryAsync(cat.Id);
                dtos.Add(new CategoryResponseDto
                {
                    Id = cat.Id,
                    Name = cat.Name,
                    Code = cat.Code,
                    Description = cat.Description,
                    Icon = cat.Icon,
                    ProductCount = count,
                    CreatedAt = cat.CreatedAt,
                    UpdatedAt = cat.UpdatedAt
                });
            }

            return ApiResponse<List<CategoryResponseDto>>.Ok(dtos);
        }

        public async Task<ApiResponse<CategoryResponseDto>> GetByIdAsync(string id)
        {
            var category = await _categoryRepository.GetByIdAsync(id);
            if (category == null)
                return ApiResponse<CategoryResponseDto>.Fail("Category not found.");

            var count = await _productRepository.CountByCategoryAsync(category.Id);
            return ApiResponse<CategoryResponseDto>.Ok(new CategoryResponseDto
            {
                Id = category.Id,
                Name = category.Name,
                Code = category.Code,
                Description = category.Description,
                Icon = category.Icon,
                ProductCount = count,
                CreatedAt = category.CreatedAt,
                UpdatedAt = category.UpdatedAt
            });
        }

        public async Task<ApiResponse<CategoryResponseDto>> CreateAsync(CategoryCreateDto dto)
        {
            var existing = await _categoryRepository.GetByNameAsync(dto.Name.Trim());
            if (existing != null)
                return ApiResponse<CategoryResponseDto>.Fail($"Category '{dto.Name}' already exists.");

            var category = new Category
            {
                Name = dto.Name.Trim(),
                Code = dto.Code.Trim().ToUpperInvariant(),
                Description = dto.Description.Trim(),
                Icon = string.IsNullOrWhiteSpace(dto.Icon) ? "tag" : dto.Icon,
                CreatedAt = DateTime.UtcNow
            };

            await _categoryRepository.CreateAsync(category);

            return ApiResponse<CategoryResponseDto>.Ok(new CategoryResponseDto
            {
                Id = category.Id,
                Name = category.Name,
                Code = category.Code,
                Description = category.Description,
                Icon = category.Icon,
                ProductCount = 0,
                CreatedAt = category.CreatedAt
            }, "Category created successfully.");
        }

        public async Task<ApiResponse<CategoryResponseDto>> UpdateAsync(string id, CategoryUpdateDto dto)
        {
            var category = await _categoryRepository.GetByIdAsync(id);
            if (category == null)
                return ApiResponse<CategoryResponseDto>.Fail("Category not found.");

            var existingWithName = await _categoryRepository.GetByNameAsync(dto.Name.Trim());
            if (existingWithName != null && existingWithName.Id != id)
                return ApiResponse<CategoryResponseDto>.Fail($"Category name '{dto.Name}' is already in use.");

            category.Name = dto.Name.Trim();
            category.Code = dto.Code.Trim().ToUpperInvariant();
            category.Description = dto.Description.Trim();
            category.Icon = dto.Icon;
            category.UpdatedAt = DateTime.UtcNow;

            await _categoryRepository.UpdateAsync(category);
            var count = await _productRepository.CountByCategoryAsync(category.Id);

            return ApiResponse<CategoryResponseDto>.Ok(new CategoryResponseDto
            {
                Id = category.Id,
                Name = category.Name,
                Code = category.Code,
                Description = category.Description,
                Icon = category.Icon,
                ProductCount = count,
                CreatedAt = category.CreatedAt,
                UpdatedAt = category.UpdatedAt
            }, "Category updated successfully.");
        }

        public async Task<ApiResponse<bool>> DeleteAsync(string id)
        {
            var category = await _categoryRepository.GetByIdAsync(id);
            if (category == null)
                return ApiResponse<bool>.Fail("Category not found.");

            // STRICT REQUIREMENT: Prevent deletion of categories that are still referenced by products
            var assignedProductsCount = await _productRepository.CountByCategoryAsync(id);
            if (assignedProductsCount > 0)
            {
                return ApiResponse<bool>.Fail($"Cannot delete category '{category.Name}'. There are {assignedProductsCount} active product(s) assigned to this category. Please reassign or delete these products first.");
            }

            var deleted = await _categoryRepository.DeleteAsync(id);
            return ApiResponse<bool>.Ok(deleted, "Category deleted successfully.");
        }
    }
}
