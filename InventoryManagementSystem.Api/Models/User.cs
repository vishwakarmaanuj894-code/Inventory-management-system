using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace InventoryManagementSystem.Api.Models
{
    public class User
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        [BsonElement("name")]
        public string Name { get; set; } = string.Empty;

        [BsonElement("email")]
        public string Email { get; set; } = string.Empty;

        [BsonElement("passwordHash")]
        public string PasswordHash { get; set; } = string.Empty;

        [BsonElement("role")]
        public string Role { get; set; } = "Administrator"; // Administrator, InventoryManager, SalesExecutive

        [BsonElement("companyName")]
        public string CompanyName { get; set; } = "Bharat Smart Logistics & Retail Pvt Ltd";

        [BsonElement("avatar")]
        public string Avatar { get; set; } = "AD";

        [BsonElement("isActive")]
        public bool IsActive { get; set; } = true;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("lastLoginAt")]
        public DateTime? LastLoginAt { get; set; }
    }
}
