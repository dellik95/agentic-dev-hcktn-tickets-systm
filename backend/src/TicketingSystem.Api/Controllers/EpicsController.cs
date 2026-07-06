using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TicketingSystem.Application.Common;
using TicketingSystem.Application.Epics.Commands;
using TicketingSystem.Application.Epics.Queries;

namespace TicketingSystem.Api.Controllers;

[ApiController]
[Authorize]
public class EpicsController(ISender sender) : ControllerBase
{
    public record CreateEpicRequest(string Title, string? Description);

    public record UpdateEpicRequest(string Title, string? Description);

    [HttpGet("api/v1/teams/{teamId:guid}/epics")]
    public async Task<IActionResult> GetByTeam(Guid teamId, CancellationToken ct)
    {
        var epics = await sender.Send(new GetEpicsByTeamQuery(teamId), ct);
        return Ok(ApiResponse.Ok(epics));
    }

    [HttpPost("api/v1/teams/{teamId:guid}/epics")]
    public async Task<IActionResult> Create(Guid teamId, CreateEpicRequest request, CancellationToken ct)
    {
        var epic = await sender.Send(new CreateEpicCommand(teamId, request.Title, request.Description), ct);
        return StatusCode(StatusCodes.Status201Created, ApiResponse.Ok(epic));
    }

    [HttpGet("api/v1/epics/{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var epic = await sender.Send(new GetEpicByIdQuery(id), ct);
        return Ok(ApiResponse.Ok(epic));
    }

    [HttpPut("api/v1/epics/{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateEpicRequest request, CancellationToken ct)
    {
        var epic = await sender.Send(new UpdateEpicCommand(id, request.Title, request.Description), ct);
        return Ok(ApiResponse.Ok(epic));
    }

    [HttpDelete("api/v1/epics/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await sender.Send(new DeleteEpicCommand(id), ct);
        return Ok(ApiResponse.Ok());
    }
}
