namespace TicketingSystem.Application.Teams;

public record TeamDto(Guid Id, string Name, DateTime CreatedAt, DateTime UpdatedAt);

// Codes for handler-thrown domain exceptions. "Name is required" is validated by
// FluentValidation instead (see Commands) and surfaces as a generic VALIDATION_ERROR.
public static class TeamErrorCodes
{
    public const string NameTaken = "TEAM_NAME_TAKEN";
    public const string NotFound = "TEAM_NOT_FOUND";
    public const string HasDependents = "TEAM_HAS_DEPENDENTS";
}
