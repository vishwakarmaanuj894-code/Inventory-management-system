using InventoryManagementSystem.Api.Data;
using InventoryManagementSystem.Api.Models;
using MongoDB.Driver;

namespace InventoryManagementSystem.Api.Repositories
{
    public interface ISupplierRepository
    {
        Task<Supplier?> GetByIdAsync(string id);
        Task<List<Supplier>> GetAllAsync();
        Task CreateAsync(Supplier supplier);
        Task UpdateAsync(Supplier supplier);
        Task<bool> DeleteAsync(string id);
    }

    public class SupplierRepository : ISupplierRepository
    {
        private readonly IMongoDbContext _context;

        public SupplierRepository(IMongoDbContext context)
        {
            _context = context;
        }

        public async Task<Supplier?> GetByIdAsync(string id)
        {
            return await _context.Suppliers.Find(s => s.Id == id).FirstOrDefaultAsync();
        }

        public async Task<List<Supplier>> GetAllAsync()
        {
            return await _context.Suppliers.Find(_ => true).SortBy(s => s.Company).ToListAsync();
        }

        public async Task CreateAsync(Supplier supplier)
        {
            await _context.Suppliers.InsertOneAsync(supplier);
        }

        public async Task UpdateAsync(Supplier supplier)
        {
            await _context.Suppliers.ReplaceOneAsync(s => s.Id == supplier.Id, supplier);
        }

        public async Task<bool> DeleteAsync(string id)
        {
            var res = await _context.Suppliers.DeleteOneAsync(s => s.Id == id);
            return res.DeletedCount > 0;
        }
    }
}
