using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TicketingSystem.Application.Common;
using TicketingSystem.Application.Teams.Commands;
using TicketingSystem.Application.Teams.Queries;

namespace TicketingSystem.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/teams")]
public class TeamsController(ISender sender) : ControllerBase
{
    public record UpsertTeamRequest(string Name);

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var teams = await sender.Send(new GetAllTeamsQuery(), ct);
        return Ok(ApiResponse.Ok(teams));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var team = await sender.Send(new GetTeamByIdQuery(id), ct);
        return Ok(ApiResponse.Ok(team));
    }

    [HttpPost]
    public async Task<IActionResult> Create(UpsertTeamRequest request, CancellationToken ct)
    {
        var team = await sender.Send(new CreateTeamCommand(request.Name), ct);
        return StatusCode(StatusCodes.Status201Created, ApiResponse.Ok(team));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Rename(Guid id, UpsertTeamRequest request, CancellationToken ct)
    {
        var team = await sender.Send(new RenameTeamCommand(id, request.Name), ct);
        return Ok(ApiResponse.Ok(team));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await sender.Send(new DeleteTeamCommand(id), ct);
        return Ok(ApiResponse.Ok());
    }
}
