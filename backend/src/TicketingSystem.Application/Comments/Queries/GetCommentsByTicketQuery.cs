using MediatR;

namespace TicketingSystem.Application.Comments.Queries;

public record GetCommentsByTicketQuery(Guid TicketId) : IRequest<IReadOnlyList<CommentDto>>;
