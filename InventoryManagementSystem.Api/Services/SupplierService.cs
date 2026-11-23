using InventoryManagementSystem.Api.DTOs;
using InventoryManagementSystem.Api.Models;
using InventoryManagementSystem.Api.Repositories;

namespace InventoryManagementSystem.Api.Services
{
    public interface ISupplierService
    {
        Task<ApiResponse<List<SupplierResponseDto>>> GetAllAsync();
        Task<ApiResponse<SupplierResponseDto>> GetByIdAsync(string id);
        Task<ApiResponse<SupplierResponseDto>> CreateAsync(SupplierCreateDto dto);
        Task<ApiResponse<SupplierResponseDto>> UpdateAsync(string id, SupplierUpdateDto dto);
        Task<ApiResponse<bool>> DeleteAsync(string id);
    }

    public class SupplierService : ISupplierService
    {
        private readonly ISupplierRepository _supplierRepository;
        private readonly IPurchaseRepository _purchaseRepository;

        public SupplierService(ISupplierRepository supplierRepository, IPurchaseRepository purchaseRepository)
        {
            _supplierRepository = supplierRepository;
            _purchaseRepository = purchaseRepository;
        }

        public async Task<ApiResponse<List<SupplierResponseDto>>> GetAllAsync()
        {
            var suppliers = await _supplierRepository.GetAllAsync();
            var dtos = new List<SupplierResponseDto>();

            foreach (var sup in suppliers)
            {
                var purchases = await _purchaseRepository.GetBySupplierIdAsync(sup.Id);
                var totalSpent = purchases.Sum(p => p.GrandTotal);

                dtos.Add(new SupplierResponseDto
                {
                    Id = sup.Id,
                    Company = sup.Company,
                    Name = sup.Name,
                    Phone = sup.Phone,
                    Email = sup.Email,
                    Gstin = sup.Gstin,
                    Address = sup.Address,
                    City = sup.City,
                    State = sup.State,
                    PurchaseOrdersCount = purchases.Count,
                    TotalPurchasedAmount = totalSpent,
                    CreatedAt = sup.CreatedAt,
                    UpdatedAt = sup.UpdatedAt
                });
            }

            return ApiResponse<List<SupplierResponseDto>>.Ok(dtos);
        }

        public async Task<ApiResponse<SupplierResponseDto>> GetByIdAsync(string id)
        {
            var sup = await _supplierRepository.GetByIdAsync(id);
            if (sup == null)
                return ApiResponse<SupplierResponseDto>.Fail("Supplier not found.");

            var purchases = await _purchaseRepository.GetBySupplierIdAsync(sup.Id);
            return ApiResponse<SupplierResponseDto>.Ok(new SupplierResponseDto
            {
                Id = sup.Id,
                Company = sup.Company,
                Name = sup.Name,
                Phone = sup.Phone,
                Email = sup.Email,
                Gstin = sup.Gstin,
                Address = sup.Address,
                City = sup.City,
                State = sup.State,
                PurchaseOrdersCount = purchases.Count,
                TotalPurchasedAmount = purchases.Sum(p => p.GrandTotal),
                CreatedAt = sup.CreatedAt,
                UpdatedAt = sup.UpdatedAt
            });
        }

        public async Task<ApiResponse<SupplierResponseDto>> CreateAsync(SupplierCreateDto dto)
        {
            var supplier = new Supplier
            {
                Company = dto.Company.Trim(),
                Name = dto.Name.Trim(),
                Phone = dto.Phone.Trim(),
                Email = dto.Email.Trim().ToLowerInvariant(),
                Gstin = dto.Gstin.Trim().ToUpperInvariant(),
                Address = dto.Address.Trim(),
                City = dto.City.Trim(),
                State = dto.State.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            await _supplierRepository.CreateAsync(supplier);

            return ApiResponse<SupplierResponseDto>.Ok(new SupplierResponseDto
            {
                Id = supplier.Id,
                Company = supplier.Company,
                Name = supplier.Name,
                Phone = supplier.Phone,
                Email = supplier.Email,
                Gstin = supplier.Gstin,
                Address = supplier.Address,
                City = supplier.City,
                State = supplier.State,
                PurchaseOrdersCount = 0,
                TotalPurchasedAmount = 0,
                CreatedAt = supplier.CreatedAt
            }, "Supplier added successfully.");
        }

        public async Task<ApiResponse<SupplierResponseDto>> UpdateAsync(string id, SupplierUpdateDto dto)
        {
            var supplier = await _supplierRepository.GetByIdAsync(id);
            if (supplier == null)
                return ApiResponse<SupplierResponseDto>.Fail("Supplier not found.");

            supplier.Company = dto.Company.Trim();
            supplier.Name = dto.Name.Trim();
            supplier.Phone = dto.Phone.Trim();
            supplier.Email = dto.Email.Trim().ToLowerInvariant();
            supplier.Gstin = dto.Gstin.Trim().ToUpperInvariant();
            supplier.Address = dto.Address.Trim();
            supplier.City = dto.City.Trim();
            supplier.State = dto.State.Trim();
            supplier.UpdatedAt = DateTime.UtcNow;

            await _supplierRepository.UpdateAsync(supplier);

            var purchases = await _purchaseRepository.GetBySupplierIdAsync(supplier.Id);
            return ApiResponse<SupplierResponseDto>.Ok(new SupplierResponseDto
            {
                Id = supplier.Id,
                Company = supplier.Company,
                Name = supplier.Name,
                Phone = supplier.Phone,
                Email = supplier.Email,
                Gstin = supplier.Gstin,
                Address = supplier.Address,
                City = supplier.City,
                State = supplier.State,
                PurchaseOrdersCount = purchases.Count,
                TotalPurchasedAmount = purchases.Sum(p => p.GrandTotal),
                CreatedAt = supplier.CreatedAt,
                UpdatedAt = supplier.UpdatedAt
            }, "Supplier updated successfully.");
        }

        public async Task<ApiResponse<bool>> DeleteAsync(string id)
        {
            var supplier = await _supplierRepository.GetByIdAsync(id);
            if (supplier == null)
                return ApiResponse<bool>.Fail("Supplier not found.");

            // STRICT REQUIREMENT: Protect supplier records referenced by purchase history
            var purchaseCount = await _purchaseRepository.CountBySupplierAsync(id);
            if (purchaseCount > 0)
            {
                return ApiResponse<bool>.Fail($"Cannot delete supplier '{supplier.Company}'. There are {purchaseCount} historical purchase invoice(s) linked to this vendor for tax audit purposes.");
            }

            var deleted = await _supplierRepository.DeleteAsync(id);
            return ApiResponse<bool>.Ok(deleted, "Supplier deleted successfully.");
        }
    }
}
