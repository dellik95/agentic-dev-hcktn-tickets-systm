using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TicketingSystem.Application.Auth.Commands;
using TicketingSystem.Application.Auth.Queries;
using TicketingSystem.Application.Common;

namespace TicketingSystem.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController(ISender sender) : ControllerBase
{
    [HttpPost("signup")]
    public async Task<IActionResult> SignUp(SignUpCommand command, CancellationToken ct)
    {
        await sender.Send(command, ct);
        return StatusCode(StatusCodes.Status201Created, ApiResponse.Ok());
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginCommand command, CancellationToken ct)
    {
        var tokens = await sender.Send(command, ct);
        return Ok(ApiResponse.Ok(tokens));
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout(LogoutCommand command, CancellationToken ct)
    {
        await sender.Send(command, ct);
        return Ok(ApiResponse.Ok());
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(RefreshCommand command, CancellationToken ct)
    {
        var tokens = await sender.Send(command, ct);
        return Ok(ApiResponse.Ok(tokens));
    }

    [HttpGet("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromQuery] string token, CancellationToken ct)
    {
        await sender.Send(new VerifyEmailCommand(token), ct);
        return Ok(ApiResponse.Ok());
    }

    [HttpPost("resend-verification")]
    public async Task<IActionResult> ResendVerification(ResendVerificationCommand command, CancellationToken ct)
    {
        await sender.Send(command, ct);
        return Ok(ApiResponse.Ok());
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
        var result = await sender.Send(new GetCurrentUserQuery(userId), ct);
        return Ok(ApiResponse.Ok(result));
    }
}
