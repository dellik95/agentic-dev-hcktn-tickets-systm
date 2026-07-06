using TicketingSystem.Application.Common;
using TicketingSystem.Application.Tickets;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Tickets;

// Called from both CreateTicketCommandHandler and UpdateTicketCommandHandler — this is the
// single riskiest rule in the spec and the one most likely to be implemented once and
// forgotten on the second path if it isn't centralized.
internal static class TicketEpicTeamConsistency
{
    public static async Task EnsureValidAsync(
        TicketingSystemDbContext db, Guid teamId, Guid? epicId, CancellationToken cancellationToken)
    {
        if (epicId is null) return;

        var epic = await db.Epics.FindAsync([epicId.Value], cancellationToken);
        if (epic is null || epic.TeamId != teamId)
            throw new BadRequestException(TicketErrorCodes.EpicTeamMismatch,
                "The selected epic does not belong to the ticket's team.");
    }
}
