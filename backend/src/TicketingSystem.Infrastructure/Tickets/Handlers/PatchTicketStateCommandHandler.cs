using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TicketingSystem.Application.Common;
using TicketingSystem.Application.Tickets;
using TicketingSystem.Application.Tickets.Commands;
using TicketingSystem.Domain.Entities;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Tickets.Handlers;

public class PatchTicketStateCommandHandler(TicketingSystemDbContext db, IMapper mapper)
    : IRequestHandler<PatchTicketStateCommand, TicketDto>
{
    public async Task<TicketDto> Handle(PatchTicketStateCommand request, CancellationToken cancellationToken)
    {
        var ticket = await db.Tickets.FindAsync([request.Id], cancellationToken)
            ?? throw new NotFoundException(TicketErrorCodes.NotFound, "Ticket not found.");

        var newState = Enum.Parse<TicketState>(request.State);

        if (ticket.State != newState)
        {
            await TicketStateTransitionValidator.EnsureValidTransitionAsync(db, ticket.State, newState, cancellationToken);

            ticket.State = newState;
            ticket.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
        }

        var updated = await db.Tickets
            .Include(t => t.CreatedBy)
            .FirstAsync(t => t.Id == ticket.Id, cancellationToken);

        return mapper.Map<TicketDto>(updated);
    }
}
