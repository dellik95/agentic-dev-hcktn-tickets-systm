namespace TicketingSystem.Application.Tickets;

public record TicketCreatedByDto(Guid Id, string Email);

public record TicketDto(
    Guid Id,
    Guid TeamId,
    Guid? EpicId,
    string Type,
    string State,
    string Title,
    string Body,
    TicketCreatedByDto CreatedBy,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public static class TicketErrorCodes
{
    public const string NotFound = "TICKET_NOT_FOUND";
    public const string TeamNotFound = "TEAM_NOT_FOUND";
    public const string EpicTeamMismatch = "EPIC_TEAM_MISMATCH";
}
