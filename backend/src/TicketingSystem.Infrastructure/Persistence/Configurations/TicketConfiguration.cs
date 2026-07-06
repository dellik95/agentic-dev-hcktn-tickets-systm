using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TicketingSystem.Domain.Entities;

namespace TicketingSystem.Infrastructure.Persistence.Configurations;

public class TicketConfiguration : IEntityTypeConfiguration<Ticket>
{
    public void Configure(EntityTypeBuilder<Ticket> builder)
    {
        builder.ToTable("tickets");
        builder.HasKey(t => t.Id);

        builder.Property(t => t.Type).HasConversion<string>().HasMaxLength(20);
        builder.Property(t => t.State).HasConversion<string>().HasMaxLength(30);
        builder.Property(t => t.Title).HasMaxLength(500).IsRequired();
        builder.Property(t => t.Body).IsRequired();

        builder.HasIndex(t => new { t.TeamId, t.State });
        builder.HasIndex(t => new { t.TeamId, t.EpicId });

        builder.HasOne<Team>()
            .WithMany()
            .HasForeignKey(t => t.TeamId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Epic>()
            .WithMany()
            .HasForeignKey(t => t.EpicId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.CreatedBy)
            .WithMany()
            .HasForeignKey(t => t.CreatedById)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
