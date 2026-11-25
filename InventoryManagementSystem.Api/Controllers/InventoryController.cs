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
    public class InventoryController : ControllerBase
    {
        private readonly IInventoryService _inventoryService;

        public InventoryController(IInventoryService inventoryService)
        {
            _inventoryService = inventoryService;
        }

        /// <summary>
        /// Get high-level stock valuation and distribution metrics.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(ApiResponse<StockOverviewDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetStockOverview()
        {
            var result = await _inventoryService.GetStockOverviewAsync();
            return Ok(result);
        }

        /// <summary>
        /// Get products that are at or below their minimum reorder alert threshold.
        /// </summary>
        [HttpGet("low-stock")]
        [ProducesResponseType(typeof(ApiResponse<List<ProductResponseDto>>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetLowStock()
        {
            var result = await _inventoryService.GetLowStockAsync();
            return Ok(result);
        }

        /// <summary>
        /// Get stock movement audit trail log.
        /// </summary>
        [HttpGet("transactions")]
        [ProducesResponseType(typeof(ApiResponse<List<StockTransactionResponseDto>>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetTransactions([FromQuery] int limit = 200)
        {
            var clampedLimit = Math.Clamp(limit, 1, 1000);
            var result = await _inventoryService.GetTransactionsAsync(clampedLimit);
            return Ok(result);
        }

        /// <summary>
        /// Perform an authorized manual stock adjustment (add, subtract, set) with mandatory reason code.
        /// </summary>
        [HttpPost("adjust")]
        [Authorize(Roles = "Administrator,InventoryManager")]
        [ProducesResponseType(typeof(ApiResponse<StockTransactionResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<StockTransactionResponseDto>), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> AdjustStock([FromBody] StockAdjustmentDto dto)
        {
            if (!ObjectId.TryParse(dto.ProductId, out _))
            {
                return BadRequest(ApiResponse<StockTransactionResponseDto>.Fail($"Invalid MongoDB ObjectId format: '{dto.ProductId}'."));
            }

            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
                return BadRequest(ApiResponse<StockTransactionResponseDto>.Fail("Validation failed", errors));
            }

            var result = await _inventoryService.AdjustStockAsync(dto);
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
    }
}
