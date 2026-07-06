using FluentValidation;
using MediatR;

namespace TicketingSystem.Application.Auth.Commands;

public record ChangePasswordCommand(Guid UserId, string CurrentPassword, string NewPassword) : IRequest;

public class ChangePasswordCommandValidator : AbstractValidator<ChangePasswordCommand>
{
    public ChangePasswordCommandValidator()
    {
        RuleFor(x => x.CurrentPassword).NotEmpty();
        RuleFor(x => x.NewPassword).NotEmpty().MinimumLength(8).WithMessage("Password must be at least 8 characters.");
    }
}
