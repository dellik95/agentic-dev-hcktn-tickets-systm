namespace TicketingSystem.Domain.Entities;

// An explicitly-configured allowed (FromState -> ToState) transition. This table starts EMPTY on
// a fresh install (no seed data — see docs/00-implementation-roadmap.md section 3), and an empty
// table means "no restrictions configured yet, every transition is allowed" — see
// TicketStateTransitionValidator for the enforcement logic that depends on this convention.
public class TicketStateTransitionRule
{
    public Guid Id { get; set; }
    public TicketState FromState { get; set; }
    public TicketState ToState { get; set; }
}
