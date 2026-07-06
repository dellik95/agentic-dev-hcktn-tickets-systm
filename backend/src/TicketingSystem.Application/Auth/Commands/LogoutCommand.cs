using FluentValidation;
using MediatR;

namespace TicketingSystem.Application.Auth.Commands;

public record LogoutCommand(string RefreshToken) : IRequest;

public class LogoutCommandValidator : AbstractValidator<LogoutCommand>
{
    public LogoutCommandValidator()
    {
        RuleFor(x => x.RefreshToken).NotEmpty();
    }
}
