using FluentValidation;
using MediatR;

namespace TicketingSystem.Application.Auth.Commands;

public record VerifyEmailCommand(string Token) : IRequest;

public class VerifyEmailCommandValidator : AbstractValidator<VerifyEmailCommand>
{
    public VerifyEmailCommandValidator()
    {
        RuleFor(x => x.Token).NotEmpty();
    }
}
