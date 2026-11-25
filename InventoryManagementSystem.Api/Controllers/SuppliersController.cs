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
    public class SuppliersController : ControllerBase
    {
        private readonly ISupplierService _supplierService;

        public SuppliersController(ISupplierService supplierService)
        {
            _supplierService = supplierService;
        }

        /// <summary>
        /// Get all registered suppliers with order count and total spend.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(ApiResponse<List<SupplierResponseDto>>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAll()
        {
            var result = await _supplierService.GetAllAsync();
            return Ok(result);
        }

        /// <summary>
        /// Get supplier by MongoDB ObjectId.
        /// </summary>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(ApiResponse<SupplierResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<SupplierResponseDto>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<SupplierResponseDto>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetById(string id)
        {
            if (!ObjectId.TryParse(id, out _))
            {
                return BadRequest(ApiResponse<SupplierResponseDto>.Fail($"Invalid MongoDB ObjectId format: '{id}'."));
            }

            var result = await _supplierService.GetByIdAsync(id);
            if (!result.Success)
            {
                return NotFound(result);
            }

            return Ok(result);
        }

        /// <summary>
        /// Register a new supplier with GSTIN and address details.
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Administrator,InventoryManager")]
        [ProducesResponseType(typeof(ApiResponse<SupplierResponseDto>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ApiResponse<SupplierResponseDto>), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Create([FromBody] SupplierCreateDto dto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
                return BadRequest(ApiResponse<SupplierResponseDto>.Fail("Validation failed", errors));
            }

            var result = await _supplierService.CreateAsync(dto);
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result);
        }

        /// <summary>
        /// Update supplier information.
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Administrator,InventoryManager")]
        [ProducesResponseType(typeof(ApiResponse<SupplierResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<SupplierResponseDto>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<SupplierResponseDto>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Update(string id, [FromBody] SupplierUpdateDto dto)
        {
            if (!ObjectId.TryParse(id, out _))
            {
                return BadRequest(ApiResponse<SupplierResponseDto>.Fail($"Invalid MongoDB ObjectId format: '{id}'."));
            }

            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
                return BadRequest(ApiResponse<SupplierResponseDto>.Fail("Validation failed", errors));
            }

            var result = await _supplierService.UpdateAsync(id, dto);
            if (!result.Success)
            {
                return NotFound(result);
            }

            return Ok(result);
        }

        /// <summary>
        /// Delete supplier. Fails with 409 Conflict if supplier is referenced by historical purchase invoices.
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

            var result = await _supplierService.DeleteAsync(id);
            if (!result.Success)
            {
                if (result.Message.Contains("historical purchase invoice", StringComparison.OrdinalIgnoreCase))
                {
                    return Conflict(result);
                }
                return NotFound(result);
            }

            return Ok(result);
        }
    }
}
