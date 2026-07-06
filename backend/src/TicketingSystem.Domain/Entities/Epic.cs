namespace TicketingSystem.Domain.Entities;

public class Epic
{
    public Guid Id { get; set; }
    public Guid TeamId { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
