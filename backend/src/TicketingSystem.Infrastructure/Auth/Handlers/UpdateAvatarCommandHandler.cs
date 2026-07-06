using MediatR;
using Microsoft.EntityFrameworkCore;
using TicketingSystem.Application.Auth.Commands;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Auth.Handlers;

public class UpdateAvatarCommandHandler(TicketingSystemDbContext db) : IRequestHandler<UpdateAvatarCommand>
{
    public async Task Handle(UpdateAvatarCommand request, CancellationToken cancellationToken)
    {
        var user = await db.Users.FirstAsync(u => u.Id == request.UserId, cancellationToken);

        user.AvatarDataUrl = request.AvatarDataUrl;
        user.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
    }
}
