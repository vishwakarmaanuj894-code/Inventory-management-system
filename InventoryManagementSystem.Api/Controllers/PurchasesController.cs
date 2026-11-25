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
    public class PurchasesController : ControllerBase
    {
        private readonly IPurchaseService _purchaseService;

        public PurchasesController(IPurchaseService purchaseService)
        {
            _purchaseService = purchaseService;
        }

        /// <summary>
        /// Get all purchase invoices in reverse chronological order, optionally filtered by supplierId.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(ApiResponse<List<PurchaseResponseDto>>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<List<PurchaseResponseDto>>), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> GetAll([FromQuery] string? supplierId = null)
        {
            if (!string.IsNullOrWhiteSpace(supplierId) && !ObjectId.TryParse(supplierId, out _))
            {
                return BadRequest(ApiResponse<List<PurchaseResponseDto>>.Fail($"Invalid Supplier MongoDB ObjectId format: '{supplierId}'."));
            }

            var result = await _purchaseService.GetAllAsync(supplierId);
            return Ok(result);
        }

        /// <summary>
        /// Get purchase invoice details by its MongoDB ObjectId.
        /// </summary>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(ApiResponse<PurchaseResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<PurchaseResponseDto>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<PurchaseResponseDto>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetById(string id)
        {
            if (!ObjectId.TryParse(id, out _))
            {
                return BadRequest(ApiResponse<PurchaseResponseDto>.Fail($"Invalid MongoDB ObjectId format: '{id}'."));
            }

            var result = await _purchaseService.GetByIdAsync(id);
            if (!result.Success)
            {
                return NotFound(result);
            }

            return Ok(result);
        }

        /// <summary>
        /// Create a multi-item purchase invoice and automatically replenish warehouse stock.
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Administrator,InventoryManager")]
        [ProducesResponseType(typeof(ApiResponse<PurchaseResponseDto>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ApiResponse<PurchaseResponseDto>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<PurchaseResponseDto>), StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Create([FromBody] PurchaseCreateDto dto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
                return BadRequest(ApiResponse<PurchaseResponseDto>.Fail("Validation failed", errors));
            }

            if (!ObjectId.TryParse(dto.SupplierId, out _))
            {
                return BadRequest(ApiResponse<PurchaseResponseDto>.Fail("Invalid Supplier ID format."));
            }

            foreach (var item in dto.Items)
            {
                if (!ObjectId.TryParse(item.ProductId, out _))
                {
                    return BadRequest(ApiResponse<PurchaseResponseDto>.Fail($"Invalid Product ID format: '{item.ProductId}'."));
                }
            }

            var result = await _purchaseService.CreateAsync(dto);
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
