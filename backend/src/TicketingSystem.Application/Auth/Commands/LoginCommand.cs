using FluentValidation;
using MediatR;

namespace TicketingSystem.Application.Auth.Commands;

public record LoginCommand(string Email, string Password) : IRequest<AuthTokenResult>;

public class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty();
        RuleFor(x => x.Password).NotEmpty();
    }
}
