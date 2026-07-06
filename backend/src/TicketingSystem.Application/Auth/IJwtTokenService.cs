using TicketingSystem.Domain.Entities;

namespace TicketingSystem.Application.Auth;

public interface IJwtTokenService
{
    string GenerateAccessToken(User user);
}
