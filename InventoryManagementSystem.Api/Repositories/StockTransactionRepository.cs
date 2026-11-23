using InventoryManagementSystem.Api.Data;
using InventoryManagementSystem.Api.Models;
using MongoDB.Driver;

namespace InventoryManagementSystem.Api.Repositories
{
    public interface IStockTransactionRepository
    {
        Task<List<StockTransaction>> GetAllAsync(int limit = 200);
        Task<List<StockTransaction>> GetByProductIdAsync(string productId);
        Task CreateAsync(StockTransaction transaction, IClientSessionHandle? session = null);
    }

    public class StockTransactionRepository : IStockTransactionRepository
    {
        private readonly IMongoDbContext _context;

        public StockTransactionRepository(IMongoDbContext context)
        {
            _context = context;
        }

        public async Task<List<StockTransaction>> GetAllAsync(int limit = 200)
        {
            return await _context.StockTransactions
                .Find(_ => true)
                .SortByDescending(t => t.Timestamp)
                .Limit(limit)
                .ToListAsync();
        }

        public async Task<List<StockTransaction>> GetByProductIdAsync(string productId)
        {
            return await _context.StockTransactions
                .Find(t => t.ProductId == productId)
                .SortByDescending(t => t.Timestamp)
                .ToListAsync();
        }

        public async Task CreateAsync(StockTransaction transaction, IClientSessionHandle? session = null)
        {
            if (session != null)
                await _context.StockTransactions.InsertOneAsync(session, transaction);
            else
                await _context.StockTransactions.InsertOneAsync(transaction);
        }
    }
}
