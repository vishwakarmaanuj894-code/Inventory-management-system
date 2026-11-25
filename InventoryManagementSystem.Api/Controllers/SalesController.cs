using InventoryManagementSystem.Api.DTOs;
using InventoryManagementSystem.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;

namespace InventoryManagementSystem.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SalesController : ControllerBase
    {
        private readonly ISaleService _saleService;

        public SalesController(ISaleService saleService)
        {
            _saleService = saleService;
        }

        /// <summary>
        /// Get all customer sales invoices.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(ApiResponse<List<SaleResponseDto>>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAll()
        {
            var result = await _saleService.GetAllAsync();
            return Ok(result);
        }

        /// <summary>
        /// Get sales invoice details by MongoDB ObjectId.
        /// </summary>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(ApiResponse<SaleResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<SaleResponseDto>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<SaleResponseDto>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetById(string id)
        {
            if (!ObjectId.TryParse(id, out _))
            {
                return BadRequest(ApiResponse<SaleResponseDto>.Fail($"Invalid MongoDB ObjectId format: '{id}'."));
            }

            var result = await _saleService.GetByIdAsync(id);
            if (!result.Success)
            {
                return NotFound(result);
            }

            return Ok(result);
        }

        /// <summary>
        /// Create a sales invoice with real-time stock availability verification, atomic decrement, and profit tracking.
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Administrator,InventoryManager,SalesExecutive")]
        [ProducesResponseType(typeof(ApiResponse<SaleResponseDto>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ApiResponse<SaleResponseDto>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<SaleResponseDto>), StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Create([FromBody] SaleCreateDto dto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
                return BadRequest(ApiResponse<SaleResponseDto>.Fail("Validation failed", errors));
            }

            foreach (var item in dto.Items)
            {
                if (!ObjectId.TryParse(item.ProductId, out _))
                {
                    return BadRequest(ApiResponse<SaleResponseDto>.Fail($"Invalid Product ID format: '{item.ProductId}'."));
                }
            }

            var result = await _saleService.CreateAsync(dto);
            if (!result.Success)
            {
                if (result.Message.Contains("already exists", StringComparison.OrdinalIgnoreCase))
                    return Conflict(result);

                return BadRequest(result);
            }

            return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result);
        }
    }
}
