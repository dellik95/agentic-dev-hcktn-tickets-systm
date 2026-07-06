using AutoMapper;
using AutoMapper.QueryableExtensions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TicketingSystem.Application.Teams;
using TicketingSystem.Application.Teams.Queries;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Teams.Handlers;

public class GetAllTeamsQueryHandler(TicketingSystemDbContext db, IMapper mapper)
    : IRequestHandler<GetAllTeamsQuery, IReadOnlyList<TeamDto>>
{
    public async Task<IReadOnlyList<TeamDto>> Handle(GetAllTeamsQuery request, CancellationToken cancellationToken)
    {
        return await db.Teams
            .OrderBy(t => t.Name)
            .ProjectTo<TeamDto>(mapper.ConfigurationProvider)
            .ToListAsync(cancellationToken);
    }
}
