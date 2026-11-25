using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using InventoryManagementSystem.Api.DTOs;
using InventoryManagementSystem.Api.Repositories;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace InventoryManagementSystem.Api.Services
{
    public interface IAuthService
    {
        Task<ApiResponse<LoginResponseDto>> LoginAsync(LoginRequestDto request);
        Task<ApiResponse<UserProfileDto>> GetCurrentUserAsync(string userId);
    }

    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly IConfiguration _configuration;

        public AuthService(IUserRepository userRepository, IConfiguration configuration)
        {
            _userRepository = userRepository;
            _configuration = configuration;
        }

        public async Task<ApiResponse<LoginResponseDto>> LoginAsync(LoginRequestDto request)
        {
            var user = await _userRepository.GetByEmailAsync(request.Email);
            if (user == null || !user.IsActive)
            {
                return ApiResponse<LoginResponseDto>.Fail("Invalid email or password.");
            }

            bool isPasswordValid = false;
            try
            {
                isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
            }
            catch
            {
                isPasswordValid = false;
            }

            if (!isPasswordValid)
            {
                return ApiResponse<LoginResponseDto>.Fail("Invalid email or password.");
            }

            user.LastLoginAt = DateTime.UtcNow;
            await _userRepository.UpdateAsync(user);

            var tokenHandler = new JwtSecurityTokenHandler();
            var secret = Environment.GetEnvironmentVariable("JWT_SECRET") ?? _configuration["JwtSettings:Secret"];
            if (string.IsNullOrWhiteSpace(secret) || secret.StartsWith("REPLACE_WITH_", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("JWT secret is not configured.");
            }
            var key = Encoding.UTF8.GetBytes(secret);

            var issuer = _configuration["JwtSettings:Issuer"] ?? "SmartInventoryApi";
            var audience = _configuration["JwtSettings:Audience"] ?? "SmartInventoryClient";
            var expiryHours = int.TryParse(_configuration["JwtSettings:ExpiryInHours"], out var hours) ? hours : 24;
            var expiresAt = DateTime.UtcNow.AddHours(expiryHours);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id),
                    new Claim(ClaimTypes.Name, user.Name),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.Role, user.Role),
                    new Claim("company", user.CompanyName)
                }),
                Expires = expiresAt,
                Issuer = issuer,
                Audience = audience,
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            var tokenString = tokenHandler.WriteToken(token);

            var response = new LoginResponseDto
            {
                Token = tokenString,
                ExpiresAt = expiresAt,
                User = new UserProfileDto
                {
                    Id = user.Id,
                    Name = user.Name,
                    Email = user.Email,
                    Role = user.Role,
                    CompanyName = user.CompanyName,
                    Avatar = user.Avatar
                }
            };

            return ApiResponse<LoginResponseDto>.Ok(response, "Login successful");
        }

        public async Task<ApiResponse<UserProfileDto>> GetCurrentUserAsync(string userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                return ApiResponse<UserProfileDto>.Fail("User profile not found");
            }

            return ApiResponse<UserProfileDto>.Ok(new UserProfileDto
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                Role = user.Role,
                CompanyName = user.CompanyName,
                Avatar = user.Avatar
            });
        }
    }
}
