using System.Net;
using System.Net.Http.Json;
using TicketingSystem.Application.Common;
using TicketingSystem.Application.Epics;
using TicketingSystem.Application.Teams;
using TicketingSystem.Application.Tickets;

namespace TicketingSystem.IntegrationTests;

// T08.3 — a team/epic with a dependent ticket must refuse deletion (409) until that ticket is
// removed, after which deletion succeeds.
[Collection("Integration")]
public class DeleteConflictGuardTests(IntegrationTestFixture fixture)
{
    [Fact]
    public async Task DeleteTeam_ReturnsConflict_UntilItsBlockingTicketIsRemoved()
    {
        var client = await AuthenticatedUserHelper.CreateAuthenticatedClientAsync(fixture, CancellationToken.None);

        var teamResponse = await client.PostAsJsonAsync("/api/v1/teams", new { name = $"Team {Guid.NewGuid():N}" });
        Assert.Equal(HttpStatusCode.Created, teamResponse.StatusCode);
        var team = (await teamResponse.Content.ReadFromJsonAsync<ApiResponse<TeamDto>>(TestJson.Options))!.Data!;

        var ticketResponse = await client.PostAsJsonAsync(
            $"/api/v1/teams/{team.Id}/tickets",
            new { type = "bug", title = "Blocking ticket", body = "Blocks team deletion", epicId = (Guid?)null });
        Assert.Equal(HttpStatusCode.Created, ticketResponse.StatusCode);
        var ticket = (await ticketResponse.Content.ReadFromJsonAsync<ApiResponse<TicketDto>>(TestJson.Options))!.Data!;

        var firstDeleteResponse = await client.DeleteAsync($"/api/v1/teams/{team.Id}");
        Assert.Equal(HttpStatusCode.Conflict, firstDeleteResponse.StatusCode);
        var firstDeleteBody = await firstDeleteResponse.Content.ReadFromJsonAsync<ApiResponse>(TestJson.Options);
        Assert.Equal(TeamErrorCodes.HasDependents, firstDeleteBody!.Error!.Code);

        var deleteTicketResponse = await client.DeleteAsync($"/api/v1/tickets/{ticket.Id}");
        Assert.Equal(HttpStatusCode.OK, deleteTicketResponse.StatusCode);

        var secondDeleteResponse = await client.DeleteAsync($"/api/v1/teams/{team.Id}");
        Assert.Equal(HttpStatusCode.OK, secondDeleteResponse.StatusCode);
    }

    [Fact]
    public async Task DeleteEpic_ReturnsConflict_UntilItsBlockingTicketIsRemoved()
    {
        var client = await AuthenticatedUserHelper.CreateAuthenticatedClientAsync(fixture, CancellationToken.None);

        var teamResponse = await client.PostAsJsonAsync("/api/v1/teams", new { name = $"Team {Guid.NewGuid():N}" });
        Assert.Equal(HttpStatusCode.Created, teamResponse.StatusCode);
        var team = (await teamResponse.Content.ReadFromJsonAsync<ApiResponse<TeamDto>>(TestJson.Options))!.Data!;

        var epicResponse = await client.PostAsJsonAsync(
            $"/api/v1/teams/{team.Id}/epics", new { title = "Epic with a ticket", description = (string?)null });
        Assert.Equal(HttpStatusCode.Created, epicResponse.StatusCode);
        var epic = (await epicResponse.Content.ReadFromJsonAsync<ApiResponse<EpicDto>>(TestJson.Options))!.Data!;

        var ticketResponse = await client.PostAsJsonAsync(
            $"/api/v1/teams/{team.Id}/tickets",
            new { type = "bug", title = "Blocking ticket", body = "Blocks epic deletion", epicId = epic.Id });
        Assert.Equal(HttpStatusCode.Created, ticketResponse.StatusCode);
        var ticket = (await ticketResponse.Content.ReadFromJsonAsync<ApiResponse<TicketDto>>(TestJson.Options))!.Data!;

        var firstDeleteResponse = await client.DeleteAsync($"/api/v1/epics/{epic.Id}");
        Assert.Equal(HttpStatusCode.Conflict, firstDeleteResponse.StatusCode);
        var firstDeleteBody = await firstDeleteResponse.Content.ReadFromJsonAsync<ApiResponse>(TestJson.Options);
        Assert.Equal(EpicErrorCodes.HasTickets, firstDeleteBody!.Error!.Code);

        var deleteTicketResponse = await client.DeleteAsync($"/api/v1/tickets/{ticket.Id}");
        Assert.Equal(HttpStatusCode.OK, deleteTicketResponse.StatusCode);

        var secondDeleteResponse = await client.DeleteAsync($"/api/v1/epics/{epic.Id}");
        Assert.Equal(HttpStatusCode.OK, secondDeleteResponse.StatusCode);
    }
}
