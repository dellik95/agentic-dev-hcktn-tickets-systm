using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TicketingSystem.Application.Auth;
using TicketingSystem.Application.Common;

namespace TicketingSystem.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController(IAuthService authService) : ControllerBase
{
    [HttpPost("signup")]
    public async Task<IActionResult> SignUp(SignUpRequest request, CancellationToken ct)
    {
        var result = await authService.SignUpAsync(request.Email, request.Password, ct);
        return result.IsSuccess ? StatusCode(StatusCodes.Status201Created) : ToErrorResult(result);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken ct)
    {
        var result = await authService.LoginAsync(request.Email, request.Password, ct);
        return result.IsSuccess ? Ok(result.Value) : ToErrorResult(result);
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout(RefreshTokenRequest request, CancellationToken ct)
    {
        await authService.LogoutAsync(request.RefreshToken, ct);
        return NoContent();
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(RefreshTokenRequest request, CancellationToken ct)
    {
        var result = await authService.RefreshAsync(request.RefreshToken, ct);
        return result.IsSuccess ? Ok(result.Value) : ToErrorResult(result);
    }

    [HttpGet("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromQuery] string token, CancellationToken ct)
    {
        var result = await authService.VerifyEmailAsync(token, ct);
        return result.IsSuccess ? Ok() : ToErrorResult(result);
    }

    [HttpPost("resend-verification")]
    public async Task<IActionResult> ResendVerification(ResendVerificationRequest request, CancellationToken ct)
    {
        await authService.ResendVerificationAsync(request.Email, ct);
        return Accepted();
    }

    [HttpGet("me")]
    [Authorize]
    public IActionResult Me()
    {
        var id = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        var email = User.FindFirstValue(JwtRegisteredClaimNames.Email);
        var emailVerified = User.FindFirstValue("email_verified") == "true";
        return Ok(new { id, email, emailVerified });
    }

    private IActionResult ToErrorResult(Result result)
    {
        var body = new { code = result.ErrorCode, message = result.ErrorMessage };
        return result.ErrorCode switch
        {
            AuthErrorCodes.EmailTaken => Conflict(body),
            AuthErrorCodes.InvalidCredentials => Unauthorized(body),
            AuthErrorCodes.EmailNotVerified => StatusCode(StatusCodes.Status403Forbidden, body),
            AuthErrorCodes.TokenExpired => StatusCode(StatusCodes.Status410Gone, body),
            _ => BadRequest(body),
        };
    }
}
