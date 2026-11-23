using InventoryManagementSystem.Api.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace InventoryManagementSystem.Api.Data
{
    public interface IMongoDbContext
    {
        IMongoClient Client { get; }
        IMongoDatabase Database { get; }
        IMongoCollection<User> Users { get; }
        IMongoCollection<Product> Products { get; }
        IMongoCollection<Category> Categories { get; }
        IMongoCollection<Supplier> Suppliers { get; }
        IMongoCollection<Purchase> Purchases { get; }
        IMongoCollection<Sale> Sales { get; }
        IMongoCollection<StockTransaction> StockTransactions { get; }

        Task<IClientSessionHandle?> StartSessionAsync(CancellationToken cancellationToken = default);
        Task InitIndexesAndSeedAsync();
    }

    public class MongoDbContext : IMongoDbContext
    {
        private readonly IMongoClient _client;
        private readonly IMongoDatabase _database;
        private readonly ILogger<MongoDbContext> _logger;

        public IMongoClient Client => _client;
        public IMongoDatabase Database => _database;

        public IMongoCollection<User> Users => _database.GetCollection<User>("users");
        public IMongoCollection<Product> Products => _database.GetCollection<Product>("products");
        public IMongoCollection<Category> Categories => _database.GetCollection<Category>("categories");
        public IMongoCollection<Supplier> Suppliers => _database.GetCollection<Supplier>("suppliers");
        public IMongoCollection<Purchase> Purchases => _database.GetCollection<Purchase>("purchases");
        public IMongoCollection<Sale> Sales => _database.GetCollection<Sale>("sales");
        public IMongoCollection<StockTransaction> StockTransactions => _database.GetCollection<StockTransaction>("stockTransactions");

        public MongoDbContext(IConfiguration configuration, ILogger<MongoDbContext> logger)
        {
            _logger = logger;

            // Connection string prioritization:
            // 1. Environment Variable MONGODB_CONNECTION_STRING (e.g. in Azure, Docker, or Cloud Run)
            // 2. Configuration section MongoDbSettings:ConnectionString (appsettings.json)
            var connectionString = Environment.GetEnvironmentVariable("MONGODB_CONNECTION_STRING")
                                   ?? configuration["MongoDbSettings:ConnectionString"]
                                   ?? "mongodb://localhost:27017";

            var databaseName = Environment.GetEnvironmentVariable("MONGODB_DATABASE_NAME")
                               ?? configuration["MongoDbSettings:DatabaseName"]
                               ?? "SmartInventoryDb";

            var settings = MongoClientSettings.FromConnectionString(connectionString);
            settings.ServerApi = new ServerApi(ServerApiVersion.V1);
            settings.ConnectTimeout = TimeSpan.FromSeconds(10);
            settings.SocketTimeout = TimeSpan.FromSeconds(15);

            _client = new MongoClient(settings);
            _database = _client.GetDatabase(databaseName);
        }

        public async Task<IClientSessionHandle?> StartSessionAsync(CancellationToken cancellationToken = default)
        {
            try
            {
                // Multi-document ACID transactions require MongoDB replica set / Atlas cluster
                return await _client.StartSessionAsync(cancellationToken: cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "MongoDB Transactions session could not be started. Operating in standalone mode with concurrency-safe atomic operations.");
                return null;
            }
        }

        public async Task InitIndexesAndSeedAsync()
        {
            try
            {
                // 1. Product Indexes (Unique SKU index)
                var skuIndex = new CreateIndexModel<Product>(
                    Builders<Product>.IndexKeys.Ascending(p => p.Sku),
                    new CreateIndexOptions { Unique = true, Name = "idx_products_sku_unique" }
                );
                await Products.Indexes.CreateOneAsync(skuIndex);

                // 2. User Indexes (Unique Email index)
                var emailIndex = new CreateIndexModel<User>(
                    Builders<User>.IndexKeys.Ascending(u => u.Email),
                    new CreateIndexOptions { Unique = true, Name = "idx_users_email_unique" }
                );
                await Users.Indexes.CreateOneAsync(emailIndex);

                // 3. Category Indexes (Unique Name index)
                var categoryNameIndex = new CreateIndexModel<Category>(
                    Builders<Category>.IndexKeys.Ascending(c => c.Name),
                    new CreateIndexOptions { Unique = true, Name = "idx_categories_name_unique" }
                );
                await Categories.Indexes.CreateOneAsync(categoryNameIndex);

                // 4. Seed default admin user if none exists
                var adminCount = await Users.CountDocumentsAsync(Builders<User>.Filter.Empty);
                if (adminCount == 0)
                {
                    var defaultAdmin = new User
                    {
                        Name = "Rajesh Sharma",
                        Email = "admin@smartinventory.in",
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                        Role = "Administrator",
                        CompanyName = "Bharat Smart Logistics & Retail Pvt Ltd",
                        Avatar = "RS",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };
                    await Users.InsertOneAsync(defaultAdmin);
                    _logger.LogInformation("Seeded default administrator account: admin@smartinventory.in");
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Notice during MongoDB index and seed initialization. Continuing application startup.");
            }
        }
    }
}
