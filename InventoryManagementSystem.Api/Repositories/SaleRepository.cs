using System.Text.RegularExpressions;
using InventoryManagementSystem.Api.Data;
using InventoryManagementSystem.Api.Models;
using MongoDB.Bson;
using MongoDB.Driver;

namespace InventoryManagementSystem.Api.Repositories
{
    public interface ISaleRepository
    {
        Task<Sale?> GetByIdAsync(string id);
        Task<Sale?> GetByInvoiceNumberAsync(string invoiceNumber);
        Task<List<Sale>> GetAllAsync();
        Task<List<Sale>> GetByDateRangeAsync(DateTime? start, DateTime? end);
        Task CreateAsync(Sale sale, IClientSessionHandle? session = null);
    }

    public class SaleRepository : ISaleRepository
    {
        private readonly IMongoDbContext _context;

        public SaleRepository(IMongoDbContext context)
        {
            _context = context;
        }

        public async Task<Sale?> GetByIdAsync(string id)
        {
            return await _context.Sales.Find(s => s.Id == id).FirstOrDefaultAsync();
        }

        public async Task<Sale?> GetByInvoiceNumberAsync(string invoiceNumber)
        {
            var escaped = Regex.Escape(invoiceNumber.Trim());
            var filter = Builders<Sale>.Filter.Regex(s => s.InvoiceNumber, new BsonRegularExpression($"^{escaped}$", "i"));
            return await _context.Sales.Find(filter).FirstOrDefaultAsync();
        }

        public async Task<List<Sale>> GetAllAsync()
        {
            return await _context.Sales.Find(_ => true).SortByDescending(s => s.CreatedAt).ToListAsync();
        }

        public async Task<List<Sale>> GetByDateRangeAsync(DateTime? start, DateTime? end)
        {
            var builder = Builders<Sale>.Filter;
            var filter = builder.Empty;

            if (start.HasValue)
                filter &= builder.Gte(s => s.CreatedAt, start.Value);

            if (end.HasValue)
                filter &= builder.Lte(s => s.CreatedAt, end.Value);

            return await _context.Sales.Find(filter).SortByDescending(s => s.CreatedAt).ToListAsync();
        }

        public async Task CreateAsync(Sale sale, IClientSessionHandle? session = null)
        {
            if (session != null)
                await _context.Sales.InsertOneAsync(session, sale);
            else
                await _context.Sales.InsertOneAsync(sale);
        }
    }
}
