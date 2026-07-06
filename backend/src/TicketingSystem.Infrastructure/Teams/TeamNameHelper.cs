using Microsoft.EntityFrameworkCore;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Teams;

// Shared by CreateTeamCommandHandler and RenameTeamCommandHandler.
internal static class TeamNameHelper
{
    public static Task<bool> IsTakenAsync(
        TicketingSystemDbContext db, string trimmedName, Guid? excludeId, CancellationToken cancellationToken)
    {
        var normalized = trimmedName.ToLowerInvariant();
        return db.Teams.AnyAsync(
            t => t.Name.ToLower() == normalized && (excludeId == null || t.Id != excludeId),
            cancellationToken);
    }
}
