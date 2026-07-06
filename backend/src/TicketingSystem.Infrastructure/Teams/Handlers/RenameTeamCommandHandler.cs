using AutoMapper;
using MediatR;
using TicketingSystem.Application.Common;
using TicketingSystem.Application.Teams;
using TicketingSystem.Application.Teams.Commands;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Teams.Handlers;

public class RenameTeamCommandHandler(TicketingSystemDbContext db, IMapper mapper)
    : IRequestHandler<RenameTeamCommand, TeamDto>
{
    public async Task<TeamDto> Handle(RenameTeamCommand request, CancellationToken cancellationToken)
    {
        var team = await db.Teams.FindAsync([request.Id], cancellationToken)
            ?? throw new NotFoundException(TeamErrorCodes.NotFound, "Team not found.");

        var trimmedName = request.Name.Trim();

        if (await TeamNameHelper.IsTakenAsync(db, trimmedName, excludeId: request.Id, cancellationToken))
            throw new ConflictException(TeamErrorCodes.NameTaken, "A team with this name already exists.");

        if (team.Name != trimmedName)
        {
            team.Name = trimmedName;
            team.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
        }

        return mapper.Map<TeamDto>(team);
    }
}
