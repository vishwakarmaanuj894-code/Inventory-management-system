using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace InventoryManagementSystem.Api.Models
{
    public class PurchaseItem
    {
        [BsonElement("productId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string ProductId { get; set; } = string.Empty;

        [BsonElement("productName")]
        public string ProductName { get; set; } = string.Empty;

        [BsonElement("sku")]
        public string Sku { get; set; } = string.Empty;

        [BsonElement("quantity")]
        public int Quantity { get; set; }

        [BsonElement("purchasePrice")]
        [BsonRepresentation(BsonType.Decimal128)]
        public decimal PurchasePrice { get; set; }

        [BsonElement("total")]
        [BsonRepresentation(BsonType.Decimal128)]
        public decimal Total { get; set; }
    }

    public class Purchase
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        [BsonElement("invoiceNumber")]
        public string InvoiceNumber { get; set; } = string.Empty;

        [BsonElement("supplierId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string SupplierId { get; set; } = string.Empty;

        [BsonElement("supplierName")]
        public string SupplierName { get; set; } = string.Empty;

        [BsonElement("items")]
        public List<PurchaseItem> Items { get; set; } = new();

        [BsonElement("subtotal")]
        [BsonRepresentation(BsonType.Decimal128)]
        public decimal Subtotal { get; set; }

        [BsonElement("taxRate")]
        [BsonRepresentation(BsonType.Decimal128)]
        public decimal TaxRate { get; set; } = 18m;

        [BsonElement("taxAmount")]
        [BsonRepresentation(BsonType.Decimal128)]
        public decimal TaxAmount { get; set; }

        [BsonElement("discount")]
        [BsonRepresentation(BsonType.Decimal128)]
        public decimal Discount { get; set; }

        [BsonElement("grandTotal")]
        [BsonRepresentation(BsonType.Decimal128)]
        public decimal GrandTotal { get; set; }

        [BsonElement("paymentMethod")]
        public string PaymentMethod { get; set; } = "Bank Transfer";

        [BsonElement("status")]
        public string Status { get; set; } = "Completed";

        [BsonElement("notes")]
        public string Notes { get; set; } = string.Empty;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
