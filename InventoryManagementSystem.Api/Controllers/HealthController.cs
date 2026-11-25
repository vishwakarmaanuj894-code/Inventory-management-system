using InventoryManagementSystem.Api.Data;
using InventoryManagementSystem.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;

namespace InventoryManagementSystem.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HealthController : ControllerBase
    {
        private readonly IMongoDbContext _dbContext;

        public HealthController(IMongoDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// Public health check endpoint verifying ASP.NET Core Web API and MongoDB Atlas connectivity.
        /// </summary>
        [HttpGet]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status503ServiceUnavailable)]
        public async Task<IActionResult> Check()
        {
            try
            {
                await _dbContext.Database.RunCommandAsync<BsonDocument>(new BsonDocument("ping", 1));
                return Ok(ApiResponse<object>.Ok(new
                {
                    status = "Healthy",
                    database = _dbContext.Database.DatabaseNamespace.DatabaseName,
                    timestamp = DateTime.UtcNow
                }, "ASP.NET Core API and MongoDB Atlas are online"));
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable,
                    ApiResponse<object>.Fail("MongoDB Atlas health check failed: " + ex.Message));
            }
        }
    }
}
