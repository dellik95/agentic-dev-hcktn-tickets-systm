namespace TicketingSystem.Application.Comments;

public record CommentAuthorDto(Guid Id, string Email);

public record CommentDto(
    Guid Id,
    Guid TicketId,
    string Body,
    CommentAuthorDto Author,
    DateTime CreatedAt);
