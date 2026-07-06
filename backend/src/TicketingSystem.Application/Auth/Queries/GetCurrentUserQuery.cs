using MediatR;

namespace TicketingSystem.Application.Auth.Queries;

public record GetCurrentUserQuery(Guid UserId) : IRequest<CurrentUserResult>;
