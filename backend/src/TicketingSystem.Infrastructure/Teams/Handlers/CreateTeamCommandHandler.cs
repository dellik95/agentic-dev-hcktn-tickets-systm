using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TicketingSystem.Application.Common;
using TicketingSystem.Application.Teams;
using TicketingSystem.Application.Teams.Commands;
using TicketingSystem.Domain.Entities;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Teams.Handlers;

public class CreateTeamCommandHandler(TicketingSystemDbContext db, IMapper mapper)
    : IRequestHandler<CreateTeamCommand, TeamDto>
{
    public async Task<TeamDto> Handle(CreateTeamCommand request, CancellationToken cancellationToken)
    {
        var trimmedName = request.Name.Trim();

        if (await TeamNameHelper.IsTakenAsync(db, trimmedName, excludeId: null, cancellationToken))
            throw new ConflictException(TeamErrorCodes.NameTaken, "A team with this name already exists.");

        var now = DateTime.UtcNow;
        var team = new Team { Id = Guid.NewGuid(), Name = trimmedName, CreatedAt = now, UpdatedAt = now };
        db.Teams.Add(team);
        await db.SaveChangesAsync(cancellationToken);

        return mapper.Map<TeamDto>(team);
    }
}
