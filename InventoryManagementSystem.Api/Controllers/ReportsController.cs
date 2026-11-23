using InventoryManagementSystem.Api.DTOs;
using InventoryManagementSystem.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace InventoryManagementSystem.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReportsController : ControllerBase
    {
        private readonly IReportService _reportService;

        public ReportsController(IReportService reportService)
        {
            _reportService = reportService;
        }

        /// <summary>
        /// Get consolidated executive financial statement with sales, purchases, profit, and valuation.
        /// </summary>
        [HttpGet("summary")]
        [ProducesResponseType(typeof(ApiResponse<ReportSummaryDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<ReportSummaryDto>), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> GetSummary([FromQuery] ReportFilterDto filter)
        {
            if (filter.StartDate.HasValue && filter.EndDate.HasValue && filter.StartDate > filter.EndDate)
            {
                return BadRequest(ApiResponse<ReportSummaryDto>.Fail("StartDate cannot be greater than EndDate."));
            }

            var result = await _reportService.GetReportSummaryAsync(filter);
            return Ok(result);
        }

        /// <summary>
        /// Get filtered sales report.
        /// </summary>
        [HttpGet("sales")]
        [ProducesResponseType(typeof(ApiResponse<List<SaleResponseDto>>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetSales([FromQuery] ReportFilterDto filter)
        {
            var summary = await _reportService.GetReportSummaryAsync(filter);
            return Ok(ApiResponse<List<SaleResponseDto>>.Ok(summary.Data!.Sales));
        }

        /// <summary>
        /// Get filtered inward purchases procurement report.
        /// </summary>
        [HttpGet("purchases")]
        [ProducesResponseType(typeof(ApiResponse<List<PurchaseResponseDto>>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetPurchases([FromQuery] ReportFilterDto filter)
        {
            var summary = await _reportService.GetReportSummaryAsync(filter);
            return Ok(ApiResponse<List<PurchaseResponseDto>>.Ok(summary.Data!.Purchases));
        }

        /// <summary>
        /// Get current inventory asset valuation register.
        /// </summary>
        [HttpGet("inventory")]
        [ProducesResponseType(typeof(ApiResponse<InventoryValuationReportDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetInventory()
        {
            var summary = await _reportService.GetReportSummaryAsync(new ReportFilterDto());
            return Ok(ApiResponse<InventoryValuationReportDto>.Ok(summary.Data!.InventorySummary));
        }

        /// <summary>
        /// Get Gross Profit & Loss statement based on immutable cost basis recorded at time of sale.
        /// </summary>
        [HttpGet("profit")]
        [ProducesResponseType(typeof(ApiResponse<ProfitReportDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetProfit([FromQuery] ReportFilterDto filter)
        {
            var summary = await _reportService.GetReportSummaryAsync(filter);
            return Ok(ApiResponse<ProfitReportDto>.Ok(summary.Data!.ProfitSummary));
        }
    }
}
