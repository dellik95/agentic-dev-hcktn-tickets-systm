using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TicketingSystem.Application.Auth;
using TicketingSystem.Application.Auth.Queries;
using TicketingSystem.Application.Common;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Auth.Handlers;

public class GetCurrentUserQueryHandler(TicketingSystemDbContext db, IMapper mapper)
    : IRequestHandler<GetCurrentUserQuery, CurrentUserResult>
{
    public async Task<CurrentUserResult> Handle(GetCurrentUserQuery request, CancellationToken cancellationToken)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
        if (user is null)
            throw new NotFoundException("USER_NOT_FOUND", "User not found.");

        return mapper.Map<CurrentUserResult>(user);
    }
}
