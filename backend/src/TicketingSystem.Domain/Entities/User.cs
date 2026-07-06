namespace TicketingSystem.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public DateTime? EmailVerifiedAt { get; set; }
    public string? AvatarDataUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public bool IsEmailVerified => EmailVerifiedAt.HasValue;
}
