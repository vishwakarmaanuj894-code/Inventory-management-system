using InventoryManagementSystem.Api.DTOs;
using InventoryManagementSystem.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;

namespace InventoryManagementSystem.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CategoriesController : ControllerBase
    {
        private readonly ICategoryService _categoryService;

        public CategoriesController(ICategoryService categoryService)
        {
            _categoryService = categoryService;
        }

        /// <summary>
        /// Get all categories with dynamic category-wise product counts.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(ApiResponse<List<CategoryResponseDto>>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAll()
        {
            var result = await _categoryService.GetAllAsync();
            return Ok(result);
        }

        /// <summary>
        /// Get a category by its MongoDB ObjectId.
        /// </summary>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(ApiResponse<CategoryResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<CategoryResponseDto>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<CategoryResponseDto>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetById(string id)
        {
            if (!ObjectId.TryParse(id, out _))
            {
                return BadRequest(ApiResponse<CategoryResponseDto>.Fail($"Invalid MongoDB ObjectId format: '{id}'."));
            }

            var result = await _categoryService.GetByIdAsync(id);
            if (!result.Success)
            {
                return NotFound(result);
            }

            return Ok(result);
        }

        /// <summary>
        /// Create a new category.
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Administrator,InventoryManager")]
        [ProducesResponseType(typeof(ApiResponse<CategoryResponseDto>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ApiResponse<CategoryResponseDto>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<CategoryResponseDto>), StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Create([FromBody] CategoryCreateDto dto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
                return BadRequest(ApiResponse<CategoryResponseDto>.Fail("Validation failed", errors));
            }

            var result = await _categoryService.CreateAsync(dto);
            if (!result.Success)
            {
                if (result.Message.Contains("already exists", StringComparison.OrdinalIgnoreCase))
                    return Conflict(result);

                return BadRequest(result);
            }

            return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result);
        }

        /// <summary>
        /// Update an existing category.
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Administrator,InventoryManager")]
        [ProducesResponseType(typeof(ApiResponse<CategoryResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<CategoryResponseDto>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<CategoryResponseDto>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Update(string id, [FromBody] CategoryUpdateDto dto)
        {
            if (!ObjectId.TryParse(id, out _))
            {
                return BadRequest(ApiResponse<CategoryResponseDto>.Fail($"Invalid MongoDB ObjectId format: '{id}'."));
            }

            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
                return BadRequest(ApiResponse<CategoryResponseDto>.Fail("Validation failed", errors));
            }

            var result = await _categoryService.UpdateAsync(id, dto);
            if (!result.Success)
            {
                if (result.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
                    return NotFound(result);

                if (result.Message.Contains("already in use", StringComparison.OrdinalIgnoreCase))
                    return Conflict(result);

                return BadRequest(result);
            }

            return Ok(result);
        }

        /// <summary>
        /// Delete category. Fails with 409 Conflict if products are assigned.
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Administrator")]
        [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Delete(string id)
        {
            if (!ObjectId.TryParse(id, out _))
            {
                return BadRequest(ApiResponse<bool>.Fail($"Invalid MongoDB ObjectId format: '{id}'."));
            }

            var result = await _categoryService.DeleteAsync(id);
            if (!result.Success)
            {
                if (result.Message.Contains("Cannot delete category", StringComparison.OrdinalIgnoreCase))
                {
                    return Conflict(result);
                }
                return NotFound(result);
            }

            return Ok(result);
        }
    }
}
