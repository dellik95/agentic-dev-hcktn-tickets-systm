using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TicketingSystem.Application.Common;
using TicketingSystem.Application.Tickets;
using TicketingSystem.Application.Tickets.Commands;
using TicketingSystem.Application.Tickets.Queries;

namespace TicketingSystem.Api.Controllers;

[ApiController]
[Authorize]
public class TicketsController(ISender sender) : ControllerBase
{
    public record CreateTicketRequest(string Type, string Title, string Body, Guid? EpicId);
    public record UpdateTicketRequest(string Type, Guid TeamId, Guid? EpicId, string Title, string Body, string State);
    public record PatchTicketStateRequest(string State);
    public record ReplaceTicketStateTransitionRulesRequest(IReadOnlyList<TicketStateTransitionRuleDto> Rules);

    [HttpGet("api/v1/teams/{teamId:guid}/tickets")]
    public async Task<IActionResult> GetByTeam(
        Guid teamId,
        [FromQuery] string? type,
        [FromQuery] Guid? epicId,
        [FromQuery] string? state,
        [FromQuery] string? q,
        CancellationToken ct)
    {
        var tickets = await sender.Send(new GetTicketsByTeamQuery(teamId, type, epicId, state, q), ct);
        return Ok(ApiResponse.Ok(tickets));
    }

    [HttpPost("api/v1/teams/{teamId:guid}/tickets")]
    public async Task<IActionResult> Create(Guid teamId, CreateTicketRequest request, CancellationToken ct)
    {
        var createdById = Guid.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
        var ticket = await sender.Send(
            new CreateTicketCommand(teamId, createdById, request.Type, request.Title, request.Body, request.EpicId), ct);
        return StatusCode(StatusCodes.Status201Created, ApiResponse.Ok(ticket));
    }

    [HttpGet("api/v1/tickets/{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var ticket = await sender.Send(new GetTicketByIdQuery(id), ct);
        return Ok(ApiResponse.Ok(ticket));
    }

    [HttpPut("api/v1/tickets/{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateTicketRequest request, CancellationToken ct)
    {
        var ticket = await sender.Send(
            new UpdateTicketCommand(id, request.TeamId, request.Type, request.EpicId, request.Title, request.Body, request.State), ct);
        return Ok(ApiResponse.Ok(ticket));
    }

    [HttpPatch("api/v1/tickets/{id:guid}/state")]
    public async Task<IActionResult> PatchState(Guid id, PatchTicketStateRequest request, CancellationToken ct)
    {
        var ticket = await sender.Send(new PatchTicketStateCommand(id, request.State), ct);
        return Ok(ApiResponse.Ok(ticket));
    }

    [HttpDelete("api/v1/tickets/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await sender.Send(new DeleteTicketCommand(id), ct);
        return Ok(ApiResponse.Ok());
    }

    [HttpGet("api/v1/ticket-state-transition-rules")]
    public async Task<IActionResult> GetStateTransitionRules(CancellationToken ct)
    {
        var rules = await sender.Send(new GetTicketStateTransitionRulesQuery(), ct);
        return Ok(ApiResponse.Ok(rules));
    }

    [HttpPut("api/v1/ticket-state-transition-rules")]
    public async Task<IActionResult> ReplaceStateTransitionRules(ReplaceTicketStateTransitionRulesRequest request, CancellationToken ct)
    {
        var rules = await sender.Send(new ReplaceTicketStateTransitionRulesCommand(request.Rules), ct);
        return Ok(ApiResponse.Ok(rules));
    }
}
