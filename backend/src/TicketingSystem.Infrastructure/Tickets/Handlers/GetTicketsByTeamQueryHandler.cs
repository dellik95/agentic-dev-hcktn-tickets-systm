using AutoMapper;
using AutoMapper.QueryableExtensions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TicketingSystem.Application.Tickets;
using TicketingSystem.Application.Tickets.Queries;
using TicketingSystem.Domain.Entities;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Tickets.Handlers;

public class GetTicketsByTeamQueryHandler(TicketingSystemDbContext db, IMapper mapper)
    : IRequestHandler<GetTicketsByTeamQuery, IReadOnlyList<TicketDto>>
{
    public async Task<IReadOnlyList<TicketDto>> Handle(GetTicketsByTeamQuery request, CancellationToken cancellationToken)
    {
        var query = db.Tickets.Where(t => t.TeamId == request.TeamId);

        if (!string.IsNullOrEmpty(request.Type))
        {
            var type = Enum.Parse<TicketType>(request.Type);
            query = query.Where(t => t.Type == type);
        }

        if (request.EpicId is not null)
        {
            query = query.Where(t => t.EpicId == request.EpicId);
        }

        if (!string.IsNullOrEmpty(request.State))
        {
            var state = Enum.Parse<TicketState>(request.State);
            query = query.Where(t => t.State == state);
        }

        if (!string.IsNullOrEmpty(request.Q))
        {
            var q = request.Q.ToLower();
            query = query.Where(t => t.Title.ToLower().Contains(q));
        }

        return await query
            .OrderByDescending(t => t.UpdatedAt)
            .ProjectTo<TicketDto>(mapper.ConfigurationProvider)
            .ToListAsync(cancellationToken);
    }
}
