using AutoMapper;
using MediatR;
using TicketingSystem.Application.Common;
using TicketingSystem.Application.Teams;
using TicketingSystem.Application.Teams.Queries;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Teams.Handlers;

public class GetTeamByIdQueryHandler(TicketingSystemDbContext db, IMapper mapper)
    : IRequestHandler<GetTeamByIdQuery, TeamDto>
{
    public async Task<TeamDto> Handle(GetTeamByIdQuery request, CancellationToken cancellationToken)
    {
        var team = await db.Teams.FindAsync([request.Id], cancellationToken)
            ?? throw new NotFoundException(TeamErrorCodes.NotFound, "Team not found.");

        return mapper.Map<TeamDto>(team);
    }
}
