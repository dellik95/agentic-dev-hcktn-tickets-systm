using FluentValidation;
using MediatR;

namespace TicketingSystem.Application.Auth.Commands;

public record RefreshCommand(string RefreshToken) : IRequest<AuthTokenResult>;

public class RefreshCommandValidator : AbstractValidator<RefreshCommand>
{
    public RefreshCommandValidator()
    {
        RuleFor(x => x.RefreshToken).NotEmpty();
    }
}
