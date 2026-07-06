using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TicketingSystem.Application.Comments;
using TicketingSystem.Application.Comments.Commands;
using TicketingSystem.Application.Common;
using TicketingSystem.Application.Tickets;
using TicketingSystem.Domain.Entities;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Comments.Handlers;

public class CreateCommentCommandHandler(TicketingSystemDbContext db, IMapper mapper)
    : IRequestHandler<CreateCommentCommand, CommentDto>
{
    public async Task<CommentDto> Handle(CreateCommentCommand request, CancellationToken cancellationToken)
    {
        // Deliberately AnyAsync (not FindAsync/FirstAsync): this must never load the Ticket entity
        // into the change tracker. If it did, a future edit near this code (e.g. someone
        // "helpfully" adding ticket.UpdatedAt = DateTime.UtcNow) could get swept into the same
        // SaveChangesAsync call below and silently touch the parent ticket row on every comment.
        var ticketExists = await db.Tickets.AnyAsync(t => t.Id == request.TicketId, cancellationToken);
        if (!ticketExists)
        {
            throw new NotFoundException(TicketErrorCodes.NotFound, "Ticket not found.");
        }

        var comment = new Comment
        {
            Id = Guid.NewGuid(),
            TicketId = request.TicketId,
            AuthorId = request.AuthorId,
            Body = request.Body.Trim(),
            CreatedAt = DateTime.UtcNow,
        };
        db.Comments.Add(comment);
        await db.SaveChangesAsync(cancellationToken);

        // Author nav isn't populated by SaveChanges — reload with it included so the DTO's
        // nested author object is populated in one extra indexed lookup, same pattern as
        // CreateTicketCommandHandler.
        var created = await db.Comments
            .Include(c => c.Author)
            .FirstAsync(c => c.Id == comment.Id, cancellationToken);

        return mapper.Map<CommentDto>(created);
    }
}
