using MediatR;

namespace TicketingSystem.Application.Tickets.Queries;

public record GetTicketStateTransitionRulesQuery : IRequest<IReadOnlyList<TicketStateTransitionRuleDto>>;
