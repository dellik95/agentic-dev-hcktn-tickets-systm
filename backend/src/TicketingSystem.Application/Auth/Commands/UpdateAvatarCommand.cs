using FluentValidation;
using MediatR;

namespace TicketingSystem.Application.Auth.Commands;

public record UpdateAvatarCommand(Guid UserId, string AvatarDataUrl) : IRequest;

public class UpdateAvatarCommandValidator : AbstractValidator<UpdateAvatarCommand>
{
    public UpdateAvatarCommandValidator()
    {
        RuleFor(x => x.AvatarDataUrl)
            .NotEmpty()
            .Must(v => v.StartsWith("data:image/", StringComparison.Ordinal))
            .WithMessage("Avatar must be a data URL starting with 'data:image/'.")
            .MaximumLength(2_000_000)
            .WithMessage("Avatar image is too large (must not exceed 2,000,000 characters).");
    }
}
