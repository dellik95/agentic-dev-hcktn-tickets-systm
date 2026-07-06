namespace TicketingSystem.Application.Epics;

public record EpicDto(Guid Id, Guid TeamId, string Title, string? Description, DateTime CreatedAt, DateTime UpdatedAt);

public static class EpicErrorCodes
{
    public const string NotFound = "EPIC_NOT_FOUND";
    public const string TeamNotFound = "TEAM_NOT_FOUND"; // reuse Teams' own code for "no such team"
    public const string HasTickets = "EPIC_HAS_TICKETS";
}
