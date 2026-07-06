using System.Net;
using System.Net.Http.Json;
using TicketingSystem.Application.Common;
using TicketingSystem.Application.Epics;
using TicketingSystem.Application.Teams;
using TicketingSystem.Application.Tickets;

namespace TicketingSystem.IntegrationTests;

// T08.2 — the single riskiest business rule identified in Epic 04: a ticket's epic (if any) must
// belong to the same team the ticket is being created under.
[Collection("Integration")]
public class TicketCrossTeamValidationTests(IntegrationTestFixture fixture)
{
    [Fact]
    public async Task CreateTicket_RejectsEpicFromAnotherTeam_ThenSucceedsUnderTheEpicsOwnTeam()
    {
        var client = await AuthenticatedUserHelper.CreateAuthenticatedClientAsync(fixture, CancellationToken.None);

        var teamAResponse = await client.PostAsJsonAsync("/api/v1/teams", new { name = $"Team A {Guid.NewGuid():N}" });
        Assert.Equal(HttpStatusCode.Created, teamAResponse.StatusCode);
        var teamA = (await teamAResponse.Content.ReadFromJsonAsync<ApiResponse<TeamDto>>(TestJson.Options))!.Data!;

        var epicResponse = await client.PostAsJsonAsync(
            $"/api/v1/teams/{teamA.Id}/epics", new { title = "Epic under team A", description = (string?)null });
        Assert.Equal(HttpStatusCode.Created, epicResponse.StatusCode);
        var epic = (await epicResponse.Content.ReadFromJsonAsync<ApiResponse<EpicDto>>(TestJson.Options))!.Data!;

        var teamBResponse = await client.PostAsJsonAsync("/api/v1/teams", new { name = $"Team B {Guid.NewGuid():N}" });
        Assert.Equal(HttpStatusCode.Created, teamBResponse.StatusCode);
        var teamB = (await teamBResponse.Content.ReadFromJsonAsync<ApiResponse<TeamDto>>(TestJson.Options))!.Data!;

        var mismatchedTicketResponse = await client.PostAsJsonAsync(
            $"/api/v1/teams/{teamB.Id}/tickets",
            new { type = "bug", title = "Cross-team ticket", body = "References an epic from another team", epicId = epic.Id });
        Assert.Equal(HttpStatusCode.BadRequest, mismatchedTicketResponse.StatusCode);
        var mismatchedBody = await mismatchedTicketResponse.Content.ReadFromJsonAsync<ApiResponse>(TestJson.Options);
        Assert.Equal(TicketErrorCodes.EpicTeamMismatch, mismatchedBody!.Error!.Code);

        var validTicketResponse = await client.PostAsJsonAsync(
            $"/api/v1/teams/{teamA.Id}/tickets",
            new { type = "bug", title = "Same-team ticket", body = "References an epic from its own team", epicId = epic.Id });
        Assert.Equal(HttpStatusCode.Created, validTicketResponse.StatusCode);
    }
}
