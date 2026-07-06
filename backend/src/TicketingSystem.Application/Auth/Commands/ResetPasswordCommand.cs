using FluentValidation;
using MediatR;

namespace TicketingSystem.Application.Auth.Commands;

public record ResetPasswordCommand(string Token, string NewPassword) : IRequest;

public class ResetPasswordCommandValidator : AbstractValidator<ResetPasswordCommand>
{
    public ResetPasswordCommandValidator()
    {
        RuleFor(x => x.Token).NotEmpty();
        RuleFor(x => x.NewPassword).NotEmpty().MinimumLength(8).WithMessage("Password must be at least 8 characters.");
    }
}
