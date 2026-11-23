using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace InventoryManagementSystem.Api.Models
{
    public class Product
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        [BsonElement("name")]
        public string Name { get; set; } = string.Empty;

        [BsonElement("sku")]
        public string Sku { get; set; } = string.Empty;

        [BsonElement("description")]
        public string Description { get; set; } = string.Empty;

        [BsonElement("categoryId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string CategoryId { get; set; } = string.Empty;

        [BsonElement("categoryName")]
        public string CategoryName { get; set; } = string.Empty;

        [BsonElement("supplierId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string SupplierId { get; set; } = string.Empty;

        [BsonElement("supplierName")]
        public string SupplierName { get; set; } = string.Empty;

        [BsonElement("purchasePrice")]
        [BsonRepresentation(BsonType.Decimal128)]
        public decimal PurchasePrice { get; set; }

        [BsonElement("sellingPrice")]
        [BsonRepresentation(BsonType.Decimal128)]
        public decimal SellingPrice { get; set; }

        [BsonElement("stockQuantity")]
        public int StockQuantity { get; set; }

        [BsonElement("minStockLevel")]
        public int MinStockLevel { get; set; } = 5;

        [BsonElement("unit")]
        public string Unit { get; set; } = "pcs";

        [BsonElement("imageUrl")]
        public string ImageUrl { get; set; } = string.Empty;

        [BsonElement("status")]
        public string Status { get; set; } = "in_stock"; // in_stock, low_stock, out_of_stock

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedAt")]
        public DateTime? UpdatedAt { get; set; }

        public void RecalculateStatus()
        {
            if (StockQuantity <= 0)
            {
                Status = "out_of_stock";
                StockQuantity = Math.Max(0, StockQuantity);
            }
            else if (StockQuantity <= MinStockLevel)
            {
                Status = "low_stock";
            }
            else
            {
                Status = "in_stock";
            }
        }
    }
}
