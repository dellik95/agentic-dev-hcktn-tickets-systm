using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TicketingSystem.Application.Comments.Commands;
using TicketingSystem.Application.Comments.Queries;
using TicketingSystem.Application.Common;

namespace TicketingSystem.Api.Controllers;

[ApiController]
[Authorize]
public class CommentsController(ISender sender) : ControllerBase
{
    public record CreateCommentRequest(string Body);

    [HttpGet("api/v1/tickets/{ticketId:guid}/comments")]
    public async Task<IActionResult> GetByTicket(Guid ticketId, CancellationToken ct)
    {
        var comments = await sender.Send(new GetCommentsByTicketQuery(ticketId), ct);
        return Ok(ApiResponse.Ok(comments));
    }

    [HttpPost("api/v1/tickets/{ticketId:guid}/comments")]
    public async Task<IActionResult> Create(Guid ticketId, CreateCommentRequest request, CancellationToken ct)
    {
        var authorId = Guid.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
        var comment = await sender.Send(new CreateCommentCommand(ticketId, authorId, request.Body), ct);
        return StatusCode(StatusCodes.Status201Created, ApiResponse.Ok(comment));
    }
}
