using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace TicketingSystem.IntegrationTests;

// Ports e2e/helpers/mailpit.ts's technique to C#: list messages, find the one addressed to the
// signup email, fetch its full body, and regex-extract the verification token out of the HTML.
internal static partial class MailpitClient
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static async Task<string> GetVerificationTokenAsync(
        HttpClient mailpitHttpClient, string email, CancellationToken ct)
    {
        // Delivery via a real SMTP hop (even to a local Mailpit) is not instant — a single
        // immediate GET is flaky, so poll briefly instead.
        for (var attempt = 1; attempt <= 10; attempt++)
        {
            var message = await FindMessageForAsync(mailpitHttpClient, email, ct);
            if (message is not null)
            {
                var fullMessage = await mailpitHttpClient.GetFromJsonAsync<MailpitFullMessage>(
                    $"/api/v1/message/{message.ID}", JsonOptions, ct);

                var match = TokenPattern().Match(fullMessage?.HTML ?? string.Empty);
                if (match.Success)
                    return match.Groups[1].Value;

                throw new InvalidOperationException("No verification token found in email HTML.");
            }

            await Task.Delay(TimeSpan.FromMilliseconds(500), ct);
        }

        throw new InvalidOperationException($"No verification email found for {email}.");
    }

    private static async Task<MailpitMessageSummary?> FindMessageForAsync(
        HttpClient mailpitHttpClient, string email, CancellationToken ct)
    {
        var list = await mailpitHttpClient.GetFromJsonAsync<MailpitMessageList>("/api/v1/messages", JsonOptions, ct);
        return list?.Messages.FirstOrDefault(m => m.To.Any(to =>
            string.Equals(to.Address, email, StringComparison.OrdinalIgnoreCase)));
    }

    [GeneratedRegex("token=([^\"&]+)")]
    private static partial Regex TokenPattern();

    private record MailpitMessageList(List<MailpitMessageSummary> Messages);

    private record MailpitMessageSummary(string ID, List<MailpitAddress> To);

    private record MailpitAddress(string Address);

    private record MailpitFullMessage([property: JsonPropertyName("HTML")] string HTML);
}
