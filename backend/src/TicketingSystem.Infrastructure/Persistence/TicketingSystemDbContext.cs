using Microsoft.EntityFrameworkCore;

namespace TicketingSystem.Infrastructure.Persistence;

public class TicketingSystemDbContext(DbContextOptions<TicketingSystemDbContext> options)
    : DbContext(options)
{
    // DbSets are added epic-by-epic (users in Epic 01, teams in Epic 02, etc.)
    // as their entities land in TicketingSystem.Domain.
}
