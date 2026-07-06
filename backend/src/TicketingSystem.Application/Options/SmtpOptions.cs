namespace TicketingSystem.Application.Options;

public class SmtpOptions
{
    public const string SectionName = "Smtp";

    public required string Host { get; set; }
    public int Port { get; set; } = 25;
    public string? User { get; set; }
    public string? Password { get; set; }
    public required string From { get; set; }
}
