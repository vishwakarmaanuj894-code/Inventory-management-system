using System.Text.RegularExpressions;
using InventoryManagementSystem.Api.Data;
using InventoryManagementSystem.Api.Models;
using MongoDB.Bson;
using MongoDB.Driver;

namespace InventoryManagementSystem.Api.Repositories
{
    public interface IProductRepository
    {
        Task<Product?> GetByIdAsync(string id, IClientSessionHandle? session = null);
        Task<Product?> GetBySkuAsync(string sku);
        Task<List<Product>> GetAllAsync(string? search = null, string? categoryId = null, string? status = null);
        Task<List<Product>> GetLowStockAsync();
        Task<int> CountByCategoryAsync(string categoryId);
        Task CreateAsync(Product product, IClientSessionHandle? session = null);
        Task UpdateAsync(Product product, IClientSessionHandle? session = null);
        Task<bool> UpdateStockAtomicAsync(string productId, int quantityDelta, IClientSessionHandle? session = null);
        Task UpdatePurchasePriceAsync(string productId, decimal purchasePrice, IClientSessionHandle? session = null);
        Task<bool> DeleteAsync(string id);
    }

    public class ProductRepository : IProductRepository
    {
        private readonly IMongoDbContext _context;

        public ProductRepository(IMongoDbContext context)
        {
            _context = context;
        }

        public async Task<Product?> GetByIdAsync(string id, IClientSessionHandle? session = null)
        {
            if (session != null)
                return await _context.Products.Find(session, p => p.Id == id).FirstOrDefaultAsync();

            return await _context.Products.Find(p => p.Id == id).FirstOrDefaultAsync();
        }

        public async Task<Product?> GetBySkuAsync(string sku)
        {
            var escapedSku = Regex.Escape(sku.Trim());
            var filter = Builders<Product>.Filter.Regex(p => p.Sku, new BsonRegularExpression($"^{escapedSku}$", "i"));
            return await _context.Products.Find(filter).FirstOrDefaultAsync();
        }

        public async Task<List<Product>> GetAllAsync(string? search = null, string? categoryId = null, string? status = null)
        {
            var builder = Builders<Product>.Filter;
            var filter = builder.Empty;

            if (!string.IsNullOrWhiteSpace(search))
            {
                var escapedSearch = Regex.Escape(search.Trim());
                var regex = new BsonRegularExpression(escapedSearch, "i");
                var searchFilter = builder.Or(
                    builder.Regex(p => p.Name, regex),
                    builder.Regex(p => p.Sku, regex),
                    builder.Regex(p => p.CategoryName, regex)
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

            var options = new FindOneAndUpdateOptions<Product>
            {
                ReturnDocument = ReturnDocument.After
            };

            Product? updatedProduct;
            if (session != null)
                updatedProduct = await _context.Products.FindOneAndUpdateAsync(session, filter, update, options);
            else
                updatedProduct = await _context.Products.FindOneAndUpdateAsync(filter, update, options);

            if (updatedProduct == null)
                return false;

            var prevStatus = updatedProduct.Status;
            updatedProduct.RecalculateStatus();
            if (updatedProduct.Status != prevStatus)
            {
                var statusUpdate = Builders<Product>.Update.Set(p => p.Status, updatedProduct.Status);
                if (session != null)
                    await _context.Products.UpdateOneAsync(session, p => p.Id == productId, statusUpdate);
                else
                    await _context.Products.UpdateOneAsync(p => p.Id == productId, statusUpdate);
            }

            return true;
        }

        public async Task UpdatePurchasePriceAsync(string productId, decimal purchasePrice, IClientSessionHandle? session = null)
        {
            var update = Builders<Product>.Update
                .Set(p => p.PurchasePrice, purchasePrice)
                .Set(p => p.UpdatedAt, DateTime.UtcNow);

            if (session != null)
                await _context.Products.UpdateOneAsync(session, p => p.Id == productId, update);
            else
                await _context.Products.UpdateOneAsync(p => p.Id == productId, update);
        }

        public async Task<bool> DeleteAsync(string id)
        {
            var res = await _context.Products.DeleteOneAsync(p => p.Id == id);
            return res.DeletedCount > 0;
        }
    }
}
