using MediatR;
using Microsoft.EntityFrameworkCore;
using TicketingSystem.Application.Auth;
using TicketingSystem.Application.Auth.Commands;
using TicketingSystem.Application.Common;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Auth.Handlers;

public class ChangePasswordCommandHandler(TicketingSystemDbContext db, IPasswordHasher passwordHasher)
    : IRequestHandler<ChangePasswordCommand>
{
    public async Task Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
    {
        var user = await db.Users.FirstAsync(u => u.Id == request.UserId, cancellationToken);

        if (!passwordHasher.Verify(request.CurrentPassword, user.PasswordHash))
            throw new BadRequestException(AuthErrorCodes.IncorrectPassword, "The current password is incorrect.");

        user.PasswordHash = passwordHasher.Hash(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
    }
}
