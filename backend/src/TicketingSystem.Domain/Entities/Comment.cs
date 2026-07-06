namespace TicketingSystem.Domain.Entities;

public class Comment
{
    public Guid Id { get; set; }
    public Guid TicketId { get; set; }
    public Guid AuthorId { get; set; }
    public User? Author { get; set; }
    public required string Body { get; set; }
    public DateTime CreatedAt { get; set; }
}
