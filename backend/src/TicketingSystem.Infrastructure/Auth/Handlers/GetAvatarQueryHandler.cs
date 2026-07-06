using MediatR;
using Microsoft.EntityFrameworkCore;
using TicketingSystem.Application.Auth.Queries;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Auth.Handlers;

public class GetAvatarQueryHandler(TicketingSystemDbContext db) : IRequestHandler<GetAvatarQuery, string?>
{
    public async Task<string?> Handle(GetAvatarQuery request, CancellationToken cancellationToken)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
        return user?.AvatarDataUrl;
    }
}
