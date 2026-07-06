using AutoMapper;
using AutoMapper.QueryableExtensions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TicketingSystem.Application.Comments;
using TicketingSystem.Application.Comments.Queries;
using TicketingSystem.Application.Common;
using TicketingSystem.Application.Tickets;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Comments.Handlers;

public class GetCommentsByTicketQueryHandler(TicketingSystemDbContext db, IMapper mapper)
    : IRequestHandler<GetCommentsByTicketQuery, IReadOnlyList<CommentDto>>
{
    public async Task<IReadOnlyList<CommentDto>> Handle(GetCommentsByTicketQuery request, CancellationToken cancellationToken)
    {
        var ticketExists = await db.Tickets.AnyAsync(t => t.Id == request.TicketId, cancellationToken);
        if (!ticketExists)
            throw new NotFoundException(TicketErrorCodes.NotFound, "Ticket not found.");

        return await db.Comments
            .Where(c => c.TicketId == request.TicketId)
            .OrderBy(c => c.CreatedAt)
            .ProjectTo<CommentDto>(mapper.ConfigurationProvider)
            .ToListAsync(cancellationToken);
    }
}
