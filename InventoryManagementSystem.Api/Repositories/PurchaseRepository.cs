using InventoryManagementSystem.Api.Data;
using InventoryManagementSystem.Api.Models;
using MongoDB.Driver;

namespace InventoryManagementSystem.Api.Repositories
{
    public interface IPurchaseRepository
    {
        Task<Purchase?> GetByIdAsync(string id);
        Task<List<Purchase>> GetAllAsync();
        Task<List<Purchase>> GetBySupplierIdAsync(string supplierId);
        Task<List<Purchase>> GetByDateRangeAsync(DateTime? start, DateTime? end);
        Task CreateAsync(Purchase purchase, IClientSessionHandle? session = null);
        Task<int> CountBySupplierAsync(string supplierId);
    }

    public class PurchaseRepository : IPurchaseRepository
    {
        private readonly IMongoDbContext _context;

        public PurchaseRepository(IMongoDbContext context)
        {
            _context = context;
        }

        public async Task<Purchase?> GetByIdAsync(string id)
        {
            return await _context.Purchases.Find(p => p.Id == id).FirstOrDefaultAsync();
        }

        public async Task<List<Purchase>> GetAllAsync()
        {
            return await _context.Purchases.Find(_ => true).SortByDescending(p => p.CreatedAt).ToListAsync();
        }

        public async Task<List<Purchase>> GetBySupplierIdAsync(string supplierId)
        {
            return await _context.Purchases.Find(p => p.SupplierId == supplierId).SortByDescending(p => p.CreatedAt).ToListAsync();
        }

        public async Task<List<Purchase>> GetByDateRangeAsync(DateTime? start, DateTime? end)
        {
            var builder = Builders<Purchase>.Filter;
            var filter = builder.Empty;

            if (start.HasValue)
                filter &= builder.Gte(p => p.CreatedAt, start.Value);

            if (end.HasValue)
                filter &= builder.Lte(p => p.CreatedAt, end.Value);

            return await _context.Purchases.Find(filter).SortByDescending(p => p.CreatedAt).ToListAsync();
        }

        public async Task CreateAsync(Purchase purchase, IClientSessionHandle? session = null)
        {
            if (session != null)
                await _context.Purchases.InsertOneAsync(session, purchase);
            else
                await _context.Purchases.InsertOneAsync(purchase);
        }

        public async Task<int> CountBySupplierAsync(string supplierId)
        {
            var count = await _context.Purchases.CountDocumentsAsync(p => p.SupplierId == supplierId);
            return (int)count;
        }
    }
}
