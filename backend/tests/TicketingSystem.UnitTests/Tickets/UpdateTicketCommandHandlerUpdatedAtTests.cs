using AutoMapper;
using Microsoft.EntityFrameworkCore;
using TicketingSystem.Application.Common;
using TicketingSystem.Application.Tickets.Commands;
using TicketingSystem.Domain.Entities;
using TicketingSystem.Infrastructure.Persistence;
using TicketingSystem.Infrastructure.Tickets.Handlers;

namespace TicketingSystem.UnitTests.Tickets;

// T08.4 — UpdateTicketCommandHandler advances UpdatedAt via a manual before/after field comparison,
// not by inspecting EF's ChangeTracker, so this exercises that actual comparison against a real
// (in-memory-provider) DbContext rather than asserting on a mocked ChangeTracker state.
public class UpdateTicketCommandHandlerUpdatedAtTests
{
    private static readonly IMapper Mapper =
        new MapperConfiguration(cfg => cfg.AddProfile<MappingProfile>()).CreateMapper();

    [Fact]
    public async Task Handle_LeavesUpdatedAtUnchanged_WhenNoFieldActuallyChanges()
    {
        var (db, ticket) = await SeedTicketAsync();
        var handler = new UpdateTicketCommandHandler(db, Mapper);
        var originalUpdatedAt = ticket.UpdatedAt;

        await handler.Handle(CommandMatching(ticket), CancellationToken.None);

        Assert.Equal(originalUpdatedAt, ticket.UpdatedAt);
    }

    [Fact]
    public async Task Handle_AdvancesUpdatedAt_WhenTitleActuallyChanges()
    {
        var (db, ticket) = await SeedTicketAsync();
        var handler = new UpdateTicketCommandHandler(db, Mapper);
        var originalUpdatedAt = ticket.UpdatedAt;
        var command = CommandMatching(ticket) with { Title = "A genuinely different title" };

        await handler.Handle(command, CancellationToken.None);

        Assert.Equal("A genuinely different title", ticket.Title);
        Assert.True(ticket.UpdatedAt > originalUpdatedAt);
    }

    private static UpdateTicketCommand CommandMatching(Ticket ticket) => new(
        ticket.Id,
        ticket.TeamId,
        ticket.Type.ToString(),
        ticket.EpicId,
        ticket.Title,
        ticket.Body,
        ticket.State.ToString());

    private static async Task<(TicketingSystemDbContext Db, Ticket Ticket)> SeedTicketAsync()
    {
        var options = new DbContextOptionsBuilder<TicketingSystemDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new TicketingSystemDbContext(options);

        // Seeded an hour in the past so "the handler left UpdatedAt alone" (test 1) and "the
        // handler advanced UpdatedAt" (test 2) are unambiguous regardless of clock resolution.
        var seededAt = DateTime.UtcNow.AddHours(-1);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "reporter@example.com",
            PasswordHash = "not-a-real-hash",
            CreatedAt = seededAt,
            UpdatedAt = seededAt,
        };
        var team = new Team { Id = Guid.NewGuid(), Name = "Team A", CreatedAt = seededAt, UpdatedAt = seededAt };
        var ticket = new Ticket
        {
            Id = Guid.NewGuid(),
            TeamId = team.Id,
            EpicId = null,
            Type = TicketType.bug,
            State = TicketState.@new,
            Title = "Original title",
            Body = "Original body",
            CreatedById = user.Id,
            CreatedAt = seededAt,
            UpdatedAt = seededAt,
        };

        db.Users.Add(user);
        db.Teams.Add(team);
        db.Tickets.Add(ticket);
        await db.SaveChangesAsync();

        return (db, ticket);
    }
}
