using MediatR;
using Microsoft.EntityFrameworkCore;
using TicketingSystem.Application.Common;
using TicketingSystem.Application.Teams;
using TicketingSystem.Application.Teams.Commands;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Teams.Handlers;

public class DeleteTeamCommandHandler(TicketingSystemDbContext db) : IRequestHandler<DeleteTeamCommand>
{
    public async Task Handle(DeleteTeamCommand request, CancellationToken cancellationToken)
    {
        var team = await db.Teams.FindAsync([request.Id], cancellationToken)
            ?? throw new NotFoundException(TeamErrorCodes.NotFound, "Team not found.");

        var hasEpics = await db.Epics.AnyAsync(e => e.TeamId == request.Id, cancellationToken);
        if (hasEpics)
            throw new ConflictException(TeamErrorCodes.HasDependents, "Team cannot be deleted because it still has epics.");

        db.Teams.Remove(team);
        await db.SaveChangesAsync(cancellationToken);
    }
}
