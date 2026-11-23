using InventoryManagementSystem.Api.Data;
using InventoryManagementSystem.Api.Models;
using MongoDB.Driver;

namespace InventoryManagementSystem.Api.Repositories
{
    public interface ICategoryRepository
    {
        Task<Category?> GetByIdAsync(string id);
        Task<Category?> GetByNameAsync(string name);
        Task<List<Category>> GetAllAsync();
        Task CreateAsync(Category category);
        Task UpdateAsync(Category category);
        Task<bool> DeleteAsync(string id);
    }

    public class CategoryRepository : ICategoryRepository
    {
        private readonly IMongoDbContext _context;

        public CategoryRepository(IMongoDbContext context)
        {
            _context = context;
        }

        public async Task<Category?> GetByIdAsync(string id)
        {
            return await _context.Categories.Find(c => c.Id == id).FirstOrDefaultAsync();
        }

        public async Task<Category?> GetByNameAsync(string name)
        {
            return await _context.Categories.Find(c => c.Name.ToLower() == name.ToLower()).FirstOrDefaultAsync();
        }

        public async Task<List<Category>> GetAllAsync()
        {
            return await _context.Categories.Find(_ => true).SortBy(c => c.Name).ToListAsync();
        }

        public async Task CreateAsync(Category category)
        {
            await _context.Categories.InsertOneAsync(category);
        }

        public async Task UpdateAsync(Category category)
        {
            await _context.Categories.ReplaceOneAsync(c => c.Id == category.Id, category);
        }

        public async Task<bool> DeleteAsync(string id)
        {
            var res = await _context.Categories.DeleteOneAsync(c => c.Id == id);
            return res.DeletedCount > 0;
        }
    }
}
