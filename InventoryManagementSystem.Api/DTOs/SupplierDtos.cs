using System.ComponentModel.DataAnnotations;

namespace InventoryManagementSystem.Api.DTOs
{
    public class SupplierCreateDto
    {
        [Required(ErrorMessage = "Company name is required")]
        [StringLength(150, MinimumLength = 2)]
        public string Company { get; set; } = string.Empty;

        [Required(ErrorMessage = "Contact person name is required")]
        [StringLength(100, MinimumLength = 2)]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Phone number is required")]
        [Phone(ErrorMessage = "Invalid phone number format")]
        public string Phone { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email is required")]
        [EmailAddress(ErrorMessage = "Invalid email format")]
        public string Email { get; set; } = string.Empty;

        [RegularExpression(@"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$", ErrorMessage = "Invalid 15-digit Indian GSTIN format")]
        public string Gstin { get; set; } = string.Empty;

        [Required(ErrorMessage = "Address is required")]
        public string Address { get; set; } = string.Empty;

        [Required(ErrorMessage = "City is required")]
        public string City { get; set; } = string.Empty;

        public string State { get; set; } = "Karnataka";
    }

    public class SupplierUpdateDto
    {
        [Required(ErrorMessage = "Company name is required")]
        public string Company { get; set; } = string.Empty;

        [Required(ErrorMessage = "Contact person name is required")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Phone number is required")]
        public string Phone { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email is required")]
        public string Email { get; set; } = string.Empty;

        public string Gstin { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string State { get; set; } = string.Empty;
    }

    public class SupplierResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string Company { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Gstin { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string State { get; set; } = string.Empty;
        public int PurchaseOrdersCount { get; set; }
        public decimal TotalPurchasedAmount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
