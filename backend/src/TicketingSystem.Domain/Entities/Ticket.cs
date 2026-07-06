namespace TicketingSystem.Domain.Entities;

// Enum member names ARE the exact wire/storage values (lowercase, snake_case where the spec's
// API values have underscores) — deliberately non-PascalCase so a plain .ToString() in
// AutoMapper's automatic enum-to-string conversion produces the correct JSON value with zero
// extra configuration, and .HasConversion<string>() in EF Core stores that same literal value.
// "@new" escapes the C# reserved keyword.
public enum TicketType
{
    bug,
    feature,
    fix,
}

public enum TicketState
{
    @new,
    ready_for_implementation,
    in_progress,
    ready_for_acceptance,
    done,
}

public class Ticket
{
    public Guid Id { get; set; }
    public Guid TeamId { get; set; }
    public Guid? EpicId { get; set; }
    public TicketType Type { get; set; }
    public TicketState State { get; set; } = TicketState.@new;
    public required string Title { get; set; }
    public required string Body { get; set; }
    public Guid CreatedById { get; set; }
    public User? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
