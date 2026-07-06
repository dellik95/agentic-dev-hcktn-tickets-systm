using AutoMapper;
using MediatR;
using TicketingSystem.Application.Common;
using TicketingSystem.Application.Epics;
using TicketingSystem.Application.Epics.Commands;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Epics.Handlers;

public class UpdateEpicCommandHandler(TicketingSystemDbContext db, IMapper mapper)
    : IRequestHandler<UpdateEpicCommand, EpicDto>
{
    public async Task<EpicDto> Handle(UpdateEpicCommand request, CancellationToken cancellationToken)
    {
        var epic = await db.Epics.FindAsync([request.Id], cancellationToken)
            ?? throw new NotFoundException(EpicErrorCodes.NotFound, "Epic not found.");

        var trimmedTitle = request.Title.Trim();

        if (epic.Title != trimmedTitle || epic.Description != request.Description)
        {
            epic.Title = trimmedTitle;
            epic.Description = request.Description;
            epic.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
        }

        return mapper.Map<EpicDto>(epic);
    }
}
