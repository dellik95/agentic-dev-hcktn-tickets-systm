using MediatR;

namespace TicketingSystem.Application.Auth.Queries;

public record GetAvatarQuery(Guid UserId) : IRequest<string?>;
