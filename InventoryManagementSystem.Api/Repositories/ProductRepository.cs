using InventoryManagementSystem.Api.Data;
using InventoryManagementSystem.Api.Models;
using MongoDB.Driver;

namespace InventoryManagementSystem.Api.Repositories
{
    public interface IProductRepository
    {
        Task<Product?> GetByIdAsync(string id);
        Task<Product?> GetBySkuAsync(string sku);
        Task<List<Product>> GetAllAsync(string? search = null, string? categoryId = null, string? status = null);
        Task<List<Product>> GetLowStockAsync();
        Task<int> CountByCategoryAsync(string categoryId);
        Task CreateAsync(Product product, IClientSessionHandle? session = null);
        Task UpdateAsync(Product product, IClientSessionHandle? session = null);
        Task<bool> UpdateStockAtomicAsync(string productId, int quantityDelta, IClientSessionHandle? session = null);
        Task<bool> DeleteAsync(string id);
    }

    public class ProductRepository : IProductRepository
    {
        private readonly IMongoDbContext _context;

        public ProductRepository(IMongoDbContext context)
        {
            _context = context;
        }

        public async Task<Product?> GetByIdAsync(string id)
        {
            return await _context.Products.Find(p => p.Id == id).FirstOrDefaultAsync();
        }

        public async Task<Product?> GetBySkuAsync(string sku)
        {
            return await _context.Products.Find(p => p.Sku.ToLower() == sku.ToLower()).FirstOrDefaultAsync();
        }

        public async Task<List<Product>> GetAllAsync(string? search = null, string? categoryId = null, string? status = null)
        {
            var builder = Builders<Product>.Filter;
            var filter = builder.Empty;

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchFilter = builder.Or(
                    builder.Regex(p => p.Name, new MongoDB.Bson.BsonRegularExpression(search, "i")),
                    builder.Regex(p => p.Sku, new MongoDB.Bson.BsonRegularExpression(search, "i")),
                    builder.Regex(p => p.CategoryName, new MongoDB.Bson.BsonRegularExpression(search, "i"))
                );
                filter &= searchFilter;
            }

            if (!string.IsNullOrWhiteSpace(categoryId) && categoryId != "all")
            {
                filter &= builder.Eq(p => p.CategoryId, categoryId);
            }

            if (!string.IsNullOrWhiteSpace(status) && status != "all")
            {
                filter &= builder.Eq(p => p.Status, status);
            }

            return await _context.Products.Find(filter).SortByDescending(p => p.CreatedAt).ToListAsync();
        }

        public async Task<List<Product>> GetLowStockAsync()
        {
            var filter = Builders<Product>.Filter.Or(
                Builders<Product>.Filter.Eq(p => p.Status, "low_stock"),
                Builders<Product>.Filter.Eq(p => p.Status, "out_of_stock")
            );

            return await _context.Products.Find(filter).ToListAsync();
        }

        public async Task<int> CountByCategoryAsync(string categoryId)
        {
            var count = await _context.Products.CountDocumentsAsync(p => p.CategoryId == categoryId);
            return (int)count;
        }

        public async Task CreateAsync(Product product, IClientSessionHandle? session = null)
        {
            if (session != null)
                await _context.Products.InsertOneAsync(session, product);
            else
                await _context.Products.InsertOneAsync(product);
        }

        public async Task UpdateAsync(Product product, IClientSessionHandle? session = null)
        {
            if (session != null)
                await _context.Products.ReplaceOneAsync(session, p => p.Id == product.Id, product);
            else
                await _context.Products.ReplaceOneAsync(p => p.Id == product.Id, product);
        }

        /// <summary>
        /// Concurrency-safe atomic stock decrement/increment to prevent overselling and negative stock.
        /// </summary>
        public async Task<bool> UpdateStockAtomicAsync(string productId, int quantityDelta, IClientSessionHandle? session = null)
        {
            var builder = Builders<Product>.Filter;
            // If reducing stock (quantityDelta < 0), ensure current stock is >= abs(quantityDelta)
            FilterDefinition<Product> filter;
            if (quantityDelta < 0)
            {
                var needed = Math.Abs(quantityDelta);
                filter = builder.And(
                    builder.Eq(p => p.Id, productId),
                    builder.Gte(p => p.StockQuantity, needed)
                );
            }
            else
            {
                filter = builder.Eq(p => p.Id, productId);
            }

            var update = Builders<Product>.Update
                .Inc(p => p.StockQuantity, quantityDelta)
                .Set(p => p.UpdatedAt, DateTime.UtcNow);

            UpdateResult res;
            if (session != null)
                res = await _context.Products.UpdateOneAsync(session, filter, update);
            else
                res = await _context.Products.UpdateOneAsync(filter, update);

            if (res.ModifiedCount > 0)
            {
                // Refresh status after atomic quantity change
                var product = await GetByIdAsync(productId);
                if (product != null)
                {
                    product.RecalculateStatus();
                    await UpdateAsync(product, session);
                }
                return true;
            }

            return false;
        }

        public async Task<bool> DeleteAsync(string id)
        {
            var res = await _context.Products.DeleteOneAsync(p => p.Id == id);
            return res.DeletedCount > 0;
        }
    }
}
