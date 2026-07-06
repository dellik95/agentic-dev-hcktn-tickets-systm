using MediatR;
using Microsoft.EntityFrameworkCore;
using TicketingSystem.Application.Tickets;
using TicketingSystem.Application.Tickets.Queries;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Tickets.Handlers;

public class GetTicketStateTransitionRulesQueryHandler(TicketingSystemDbContext db)
    : IRequestHandler<GetTicketStateTransitionRulesQuery, IReadOnlyList<TicketStateTransitionRuleDto>>
{
    public async Task<IReadOnlyList<TicketStateTransitionRuleDto>> Handle(
        GetTicketStateTransitionRulesQuery request, CancellationToken cancellationToken)
    {
        return await db.TicketStateTransitionRules
            .Select(r => new TicketStateTransitionRuleDto(r.FromState.ToString(), r.ToState.ToString()))
            .ToListAsync(cancellationToken);
    }
}
