using FluentValidation;
using MediatR;

namespace TicketingSystem.Application.Auth.Commands;

public record ResendVerificationCommand(string Email) : IRequest;

public class ResendVerificationCommandValidator : AbstractValidator<ResendVerificationCommand>
{
    public ResendVerificationCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty();
    }
}
