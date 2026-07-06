using FluentValidation;
using MediatR;

namespace TicketingSystem.Application.Auth.Commands;

public record SignUpCommand(string Email, string Password) : IRequest;

public class SignUpCommandValidator : AbstractValidator<SignUpCommand>
{
    public SignUpCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().WithMessage("A valid email address is required.");
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8).WithMessage("Password must be at least 8 characters.");
    }
}
