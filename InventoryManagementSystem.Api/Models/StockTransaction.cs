using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace InventoryManagementSystem.Api.Models
{
    public class StockTransaction
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        [BsonElement("productId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string ProductId { get; set; } = string.Empty;

        [BsonElement("productName")]
        public string ProductName { get; set; } = string.Empty;

        [BsonElement("sku")]
        public string Sku { get; set; } = string.Empty;

        /// <summary>
        /// Transaction Type: PURCHASE, SALE, ADJUSTMENT_ADD, ADJUSTMENT_SUBTRACT
        /// </summary>
        [BsonElement("type")]
        public string Type { get; set; } = "PURCHASE";

        [BsonElement("quantity")]
        public int Quantity { get; set; }

        [BsonElement("previousStock")]
        public int PreviousStock { get; set; }

        [BsonElement("newStock")]
        public int NewStock { get; set; }

        [BsonElement("referenceId")]
        public string ReferenceId { get; set; } = string.Empty;

        [BsonElement("notes")]
        public string Notes { get; set; } = string.Empty;

        [BsonElement("timestamp")]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
