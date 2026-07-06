using AutoMapper;
using MediatR;
using TicketingSystem.Application.Common;
using TicketingSystem.Application.Epics;
using TicketingSystem.Application.Epics.Queries;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Epics.Handlers;

public class GetEpicByIdQueryHandler(TicketingSystemDbContext db, IMapper mapper)
    : IRequestHandler<GetEpicByIdQuery, EpicDto>
{
    public async Task<EpicDto> Handle(GetEpicByIdQuery request, CancellationToken cancellationToken)
    {
        var epic = await db.Epics.FindAsync([request.Id], cancellationToken)
            ?? throw new NotFoundException(EpicErrorCodes.NotFound, "Epic not found.");

        return mapper.Map<EpicDto>(epic);
    }
}
