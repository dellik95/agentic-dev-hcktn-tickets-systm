using FluentValidation;
using MediatR;

namespace TicketingSystem.Application.Comments.Commands;

public record CreateCommentCommand(Guid TicketId, Guid AuthorId, string Body) : IRequest<CommentDto>;

public class CreateCommentCommandValidator : AbstractValidator<CreateCommentCommand>
{
    public CreateCommentCommandValidator()
    {
        RuleFor(x => x.Body).NotEmpty().WithMessage("Comment body is required.");
    }
}
