using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TicketingSystem.Domain.Entities;

namespace TicketingSystem.Infrastructure.Persistence.Configurations;

public class TicketStateTransitionRuleConfiguration : IEntityTypeConfiguration<TicketStateTransitionRule>
{
    public void Configure(EntityTypeBuilder<TicketStateTransitionRule> builder)
    {
        builder.ToTable("ticket_state_transition_rules");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.FromState).HasConversion<string>().HasMaxLength(30);
        builder.Property(r => r.ToState).HasConversion<string>().HasMaxLength(30);

        builder.HasIndex(r => new { r.FromState, r.ToState }).IsUnique();
    }
}
