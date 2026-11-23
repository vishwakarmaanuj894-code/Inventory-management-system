using System.ComponentModel.DataAnnotations;

namespace InventoryManagementSystem.Api.DTOs
{
    public class CategoryCreateDto
    {
        [Required(ErrorMessage = "Category name is required")]
        [StringLength(100, MinimumLength = 2, ErrorMessage = "Category name must be between 2 and 100 characters")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Category code is required")]
        [StringLength(20, MinimumLength = 2, ErrorMessage = "Category code must be between 2 and 20 characters")]
        public string Code { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;
        public string Icon { get; set; } = "tag";
    }

    public class CategoryUpdateDto
    {
        [Required(ErrorMessage = "Category name is required")]
        [StringLength(100, MinimumLength = 2)]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Category code is required")]
        [StringLength(20, MinimumLength = 2)]
        public string Code { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;
        public string Icon { get; set; } = "tag";
    }

    public class CategoryResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Icon { get; set; } = "tag";
        public int ProductCount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
