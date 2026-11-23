using InventoryManagementSystem.Api.DTOs;
using InventoryManagementSystem.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;

namespace InventoryManagementSystem.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductsController : ControllerBase
    {
        private readonly IProductService _productService;

        public ProductsController(IProductService productService)
        {
            _productService = productService;
        }

        /// <summary>
        /// Get all products with optional filters for name/SKU search, category, and stock status.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(ApiResponse<List<ProductResponseDto>>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAll([FromQuery] ProductFilterDto filter)
        {
            var result = await _productService.GetAllAsync(filter);
            return Ok(result);
        }

        /// <summary>
        /// Get a product by MongoDB ObjectId.
        /// </summary>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(ApiResponse<ProductResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<ProductResponseDto>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<ProductResponseDto>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetById(string id)
        {
            if (!ObjectId.TryParse(id, out _))
            {
                return BadRequest(ApiResponse<ProductResponseDto>.Fail($"Invalid MongoDB ObjectId format: '{id}'."));
            }

            var result = await _productService.GetByIdAsync(id);
            if (!result.Success)
            {
                return NotFound(result);
            }

            return Ok(result);
        }

        /// <summary>
        /// Create a new catalog product with unique SKU verification and initial stock transaction.
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Administrator,InventoryManager")]
        [ProducesResponseType(typeof(ApiResponse<ProductResponseDto>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ApiResponse<ProductResponseDto>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<ProductResponseDto>), StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Create([FromBody] ProductCreateDto dto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
                return BadRequest(ApiResponse<ProductResponseDto>.Fail("Validation failed", errors));
            }

            if (!ObjectId.TryParse(dto.CategoryId, out _))
            {
                return BadRequest(ApiResponse<ProductResponseDto>.Fail("Invalid Category ID format."));
            }

            if (!ObjectId.TryParse(dto.SupplierId, out _))
            {
                return BadRequest(ApiResponse<ProductResponseDto>.Fail("Invalid Supplier ID format."));
            }

            var result = await _productService.CreateAsync(dto);
            if (!result.Success)
            {
                if (result.Message.Contains("already exists", StringComparison.OrdinalIgnoreCase))
                {
                    return Conflict(result);
                }
                return BadRequest(result);
            }

            return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result);
        }

        /// <summary>
        /// Update an existing product.
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Administrator,InventoryManager")]
        [ProducesResponseType(typeof(ApiResponse<ProductResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<ProductResponseDto>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<ProductResponseDto>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Update(string id, [FromBody] ProductUpdateDto dto)
        {
            if (!ObjectId.TryParse(id, out _))
            {
                return BadRequest(ApiResponse<ProductResponseDto>.Fail($"Invalid MongoDB ObjectId format: '{id}'."));
            }

            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
                return BadRequest(ApiResponse<ProductResponseDto>.Fail("Validation failed", errors));
            }

            var result = await _productService.UpdateAsync(id, dto);
            if (!result.Success)
            {
                if (result.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
                    return NotFound(result);

                if (result.Message.Contains("already assigned", StringComparison.OrdinalIgnoreCase))
                    return Conflict(result);

                return BadRequest(result);
            }

            return Ok(result);
        }

        /// <summary>
        /// Delete a product from the database.
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Administrator")]
        [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Delete(string id)
        {
            if (!ObjectId.TryParse(id, out _))
            {
                return BadRequest(ApiResponse<bool>.Fail($"Invalid MongoDB ObjectId format: '{id}'."));
            }

            var result = await _productService.DeleteAsync(id);
            if (!result.Success)
            {
                return NotFound(result);
            }

            return Ok(result);
        }
    }
}
