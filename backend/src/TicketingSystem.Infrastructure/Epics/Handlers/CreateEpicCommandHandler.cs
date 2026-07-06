using AutoMapper;
using MediatR;
using TicketingSystem.Application.Common;
using TicketingSystem.Application.Epics;
using TicketingSystem.Application.Epics.Commands;
using TicketingSystem.Domain.Entities;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Epics.Handlers;

public class CreateEpicCommandHandler(TicketingSystemDbContext db, IMapper mapper)
    : IRequestHandler<CreateEpicCommand, EpicDto>
{
    public async Task<EpicDto> Handle(CreateEpicCommand request, CancellationToken cancellationToken)
    {
        var team = await db.Teams.FindAsync([request.TeamId], cancellationToken)
            ?? throw new NotFoundException(EpicErrorCodes.TeamNotFound, "Team not found.");

        var trimmedTitle = request.Title.Trim();

        var now = DateTime.UtcNow;
        var epic = new Epic
        {
            Id = Guid.NewGuid(),
            TeamId = team.Id,
            Title = trimmedTitle,
            Description = request.Description,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Epics.Add(epic);
        await db.SaveChangesAsync(cancellationToken);

        return mapper.Map<EpicDto>(epic);
    }
}
