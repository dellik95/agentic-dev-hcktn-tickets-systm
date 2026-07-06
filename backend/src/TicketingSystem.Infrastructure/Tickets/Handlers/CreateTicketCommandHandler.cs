using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TicketingSystem.Application.Common;
using TicketingSystem.Application.Tickets;
using TicketingSystem.Application.Tickets.Commands;
using TicketingSystem.Domain.Entities;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Tickets.Handlers;

public class CreateTicketCommandHandler(TicketingSystemDbContext db, IMapper mapper)
    : IRequestHandler<CreateTicketCommand, TicketDto>
{
    public async Task<TicketDto> Handle(CreateTicketCommand request, CancellationToken cancellationToken)
    {
        var team = await db.Teams.FindAsync([request.TeamId], cancellationToken)
            ?? throw new NotFoundException(TicketErrorCodes.TeamNotFound, "Team not found.");

        await TicketEpicTeamConsistency.EnsureValidAsync(db, request.TeamId, request.EpicId, cancellationToken);

        var trimmedTitle = request.Title.Trim();

        var now = DateTime.UtcNow;
        var ticket = new Ticket
        {
            Id = Guid.NewGuid(),
            TeamId = team.Id,
            EpicId = request.EpicId,
            Type = Enum.Parse<TicketType>(request.Type),
            State = TicketState.@new,
            Title = trimmedTitle,
            Body = request.Body,
            CreatedById = request.CreatedById,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Tickets.Add(ticket);
        await db.SaveChangesAsync(cancellationToken);

        // CreatedBy nav isn't populated by SaveChanges — reload with it included so the DTO's
        // nested createdBy object is populated in one extra indexed lookup, same pattern as
        // GetTicketByIdQueryHandler.
        var created = await db.Tickets
            .Include(t => t.CreatedBy)
            .FirstAsync(t => t.Id == ticket.Id, cancellationToken);

        return mapper.Map<TicketDto>(created);
    }
}
