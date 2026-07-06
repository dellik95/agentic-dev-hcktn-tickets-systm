using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TicketingSystem.Application.Common;
using TicketingSystem.Application.Tickets;
using TicketingSystem.Application.Tickets.Commands;
using TicketingSystem.Domain.Entities;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Tickets.Handlers;

public class UpdateTicketCommandHandler(TicketingSystemDbContext db, IMapper mapper)
    : IRequestHandler<UpdateTicketCommand, TicketDto>
{
    public async Task<TicketDto> Handle(UpdateTicketCommand request, CancellationToken cancellationToken)
    {
        var ticket = await db.Tickets.FindAsync([request.Id], cancellationToken)
            ?? throw new NotFoundException(TicketErrorCodes.NotFound, "Ticket not found.");

        await TicketEpicTeamConsistency.EnsureValidAsync(db, request.TeamId, request.EpicId, cancellationToken);

        var trimmedTitle = request.Title.Trim();
        var newType = Enum.Parse<TicketType>(request.Type);
        var newState = Enum.Parse<TicketState>(request.State);

        if (ticket.Title != trimmedTitle
            || ticket.Body != request.Body
            || ticket.Type != newType
            || ticket.State != newState
            || ticket.EpicId != request.EpicId
            || ticket.TeamId != request.TeamId)
        {
            ticket.Title = trimmedTitle;
            ticket.Body = request.Body;
            ticket.Type = newType;
            ticket.State = newState;
            ticket.EpicId = request.EpicId;
            ticket.TeamId = request.TeamId;
            ticket.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
        }

        var updated = await db.Tickets
            .Include(t => t.CreatedBy)
            .FirstAsync(t => t.Id == ticket.Id, cancellationToken);

        return mapper.Map<TicketDto>(updated);
    }
}
