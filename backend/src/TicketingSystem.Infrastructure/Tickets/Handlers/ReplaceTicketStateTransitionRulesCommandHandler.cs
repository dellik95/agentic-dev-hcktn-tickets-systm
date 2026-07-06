using MediatR;
using Microsoft.EntityFrameworkCore;
using TicketingSystem.Application.Tickets;
using TicketingSystem.Application.Tickets.Commands;
using TicketingSystem.Domain.Entities;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Tickets.Handlers;

// Full-replace, like a settings form's Save button — not an incremental add/remove API. An empty
// Rules list is a legal request and clears the table back to "unrestricted" (see
// TicketStateTransitionValidator for what an empty table means at enforcement time).
public class ReplaceTicketStateTransitionRulesCommandHandler(TicketingSystemDbContext db)
    : IRequestHandler<ReplaceTicketStateTransitionRulesCommand, IReadOnlyList<TicketStateTransitionRuleDto>>
{
    public async Task<IReadOnlyList<TicketStateTransitionRuleDto>> Handle(
        ReplaceTicketStateTransitionRulesCommand request, CancellationToken cancellationToken)
    {
        var existing = await db.TicketStateTransitionRules.ToListAsync(cancellationToken);
        db.TicketStateTransitionRules.RemoveRange(existing);

        var newRules = request.Rules
            .Select(r => new TicketStateTransitionRule
            {
                Id = Guid.NewGuid(),
                FromState = Enum.Parse<TicketState>(r.FromState),
                ToState = Enum.Parse<TicketState>(r.ToState),
            })
            .ToList();

        db.TicketStateTransitionRules.AddRange(newRules);
        await db.SaveChangesAsync(cancellationToken);

        return newRules
            .Select(r => new TicketStateTransitionRuleDto(r.FromState.ToString(), r.ToState.ToString()))
            .ToList();
    }
}
