using Microsoft.EntityFrameworkCore;
using TicketingSystem.Application.Common;
using TicketingSystem.Application.Tickets;
using TicketingSystem.Domain.Entities;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Tickets;

// Called from both PatchTicketStateCommandHandler and UpdateTicketCommandHandler — the single
// enforcement point for configurable state-transition rules, so it isn't implemented once and
// forgotten on the second path (same reasoning as TicketEpicTeamConsistency).
//
// The ticket_state_transition_rules table starts EMPTY on a fresh install (no seed data), and an
// empty table means "no restrictions configured yet — every transition is allowed", preserving
// today's exact behavior until a caller explicitly configures at least one rule via
// ReplaceTicketStateTransitionRulesCommand.
internal static class TicketStateTransitionValidator
{
    public static async Task EnsureValidTransitionAsync(
        TicketingSystemDbContext db, TicketState fromState, TicketState toState, CancellationToken cancellationToken)
    {
        if (fromState == toState) return;

        var anyRulesConfigured = await db.TicketStateTransitionRules.AnyAsync(cancellationToken);
        if (!anyRulesConfigured) return;

        var isAllowed = await db.TicketStateTransitionRules
            .AnyAsync(r => r.FromState == fromState && r.ToState == toState, cancellationToken);

        if (!isAllowed)
            throw new ConflictException(TicketErrorCodes.InvalidStateTransition,
                $"Transitioning a ticket from '{fromState}' to '{toState}' is not an allowed transition.");
    }
}
