using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace InventoryManagementSystem.Api.Models
{
    public class SaleItem
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

        [BsonElement("sellingPrice")]
        [BsonRepresentation(BsonType.Decimal128)]
        public decimal SellingPrice { get; set; }

        /// <summary>
        /// Stores the actual purchase cost basis at the exact moment of sale for immutable profit calculations.
        /// </summary>
        [BsonElement("costPriceAtSale")]
        [BsonRepresentation(BsonType.Decimal128)]
        public decimal CostPriceAtSale { get; set; }

        [BsonElement("total")]
        [BsonRepresentation(BsonType.Decimal128)]
        public decimal Total { get; set; }
    }

    public class Sale
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        [BsonElement("invoiceNumber")]
        public string InvoiceNumber { get; set; } = string.Empty;

        [BsonElement("customerName")]
        public string CustomerName { get; set; } = "Walk-in Customer";

        [BsonElement("customerPhone")]
        public string CustomerPhone { get; set; } = string.Empty;

        [BsonElement("customerEmail")]
        public string CustomerEmail { get; set; } = string.Empty;

        [BsonElement("items")]
        public List<SaleItem> Items { get; set; } = new();

        [BsonElement("subtotal")]
        [BsonRepresentation(BsonType.Decimal128)]
        public decimal Subtotal { get; set; }

        /// <summary>
        /// Aggregated Cost of Goods Sold (COGS) for this specific sale.
        /// </summary>
        [BsonElement("totalCostBasis")]
        [BsonRepresentation(BsonType.Decimal128)]
        public decimal TotalCostBasis { get; set; }

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

        [BsonElement("grossProfit")]
        [BsonRepresentation(BsonType.Decimal128)]
        public decimal GrossProfit { get; set; }

        [BsonElement("paymentMethod")]
        public string PaymentMethod { get; set; } = "UPI";

        [BsonElement("status")]
        public string Status { get; set; } = "Completed";

        [BsonElement("notes")]
        public string Notes { get; set; } = string.Empty;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
