namespace TicketingSystem.Domain.Entities;

public class PasswordResetToken
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public required string TokenHash { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? UsedAt { get; set; }
    public DateTime? InvalidatedAt { get; set; }
    public DateTime CreatedAt { get; set; }

    public bool IsValid(DateTime now) => UsedAt is null && InvalidatedAt is null && ExpiresAt > now;
}
