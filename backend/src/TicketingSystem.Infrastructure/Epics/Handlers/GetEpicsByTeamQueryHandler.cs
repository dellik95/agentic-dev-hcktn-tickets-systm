using AutoMapper;
using AutoMapper.QueryableExtensions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TicketingSystem.Application.Epics;
using TicketingSystem.Application.Epics.Queries;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Epics.Handlers;

public class GetEpicsByTeamQueryHandler(TicketingSystemDbContext db, IMapper mapper)
    : IRequestHandler<GetEpicsByTeamQuery, IReadOnlyList<EpicDto>>
{
    public async Task<IReadOnlyList<EpicDto>> Handle(GetEpicsByTeamQuery request, CancellationToken cancellationToken)
    {
        return await db.Epics
            .Where(e => e.TeamId == request.TeamId)
            .OrderBy(e => e.Title)
            .ProjectTo<EpicDto>(mapper.ConfigurationProvider)
            .ToListAsync(cancellationToken);
    }
}
