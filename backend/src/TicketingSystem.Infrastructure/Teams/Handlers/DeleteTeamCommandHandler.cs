using MediatR;
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

        // No dependent-check needed yet — epics and tickets (the only things that can reference
        // a team) don't exist until Epic 03/04. Extend this handler with the same
        // TEAM_HAS_DEPENDENTS conflict described in docs/epics/EPIC-02-teams.md once they do.
        db.Teams.Remove(team);
        await db.SaveChangesAsync(cancellationToken);
    }
}
