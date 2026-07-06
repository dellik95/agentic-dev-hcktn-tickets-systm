using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TicketingSystem.Application.Common;
using TicketingSystem.Application.Tickets;
using TicketingSystem.Application.Tickets.Queries;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Tickets.Handlers;

public class GetTicketByIdQueryHandler(TicketingSystemDbContext db, IMapper mapper)
    : IRequestHandler<GetTicketByIdQuery, TicketDto>
{
    public async Task<TicketDto> Handle(GetTicketByIdQuery request, CancellationToken cancellationToken)
    {
        var ticket = await db.Tickets
            .Include(t => t.CreatedBy)
            .FirstOrDefaultAsync(t => t.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException(TicketErrorCodes.NotFound, "Ticket not found.");

        return mapper.Map<TicketDto>(ticket);
    }
}
