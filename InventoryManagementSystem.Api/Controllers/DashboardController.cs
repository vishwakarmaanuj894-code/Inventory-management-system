using InventoryManagementSystem.Api.DTOs;
using InventoryManagementSystem.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace InventoryManagementSystem.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DashboardController : ControllerBase
    {
        private readonly IDashboardService _dashboardService;

        public DashboardController(IDashboardService dashboardService)
        {
            _dashboardService = dashboardService;
        }

        /// <summary>
        /// Get executive real-time dashboard KPIs, revenue, gross profit, recent transactions, and low stock watchlist.
        /// </summary>
        [HttpGet("summary")]
        [ProducesResponseType(typeof(ApiResponse<DashboardSummaryDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetSummary()
        {
            var result = await _dashboardService.GetSummaryAsync();
            return Ok(result);
        }

        /// <summary>
        /// Get 6-month monthly trends comparing sales vs inward procurement for dashboard charts.
        /// </summary>
        [HttpGet("sales-overview")]
        [ProducesResponseType(typeof(ApiResponse<List<MonthlySalesOverviewDto>>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetSalesOverview()
        {
            var result = await _dashboardService.GetSalesOverviewAsync();
            return Ok(result);
        }
    }
}
