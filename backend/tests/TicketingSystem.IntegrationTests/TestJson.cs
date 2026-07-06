using System.Text.Json;

namespace TicketingSystem.IntegrationTests;

// ASP.NET Core's default JSON output uses camelCase property names; System.Net.Http.Json's
// ReadFromJsonAsync/PostAsJsonAsync fall back to case-sensitive, non-camelCase JsonSerializerOptions
// unless told otherwise, so every test that deserializes an API response needs this.
internal static class TestJson
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);
}
