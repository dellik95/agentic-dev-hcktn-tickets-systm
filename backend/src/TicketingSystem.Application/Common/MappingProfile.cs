using AutoMapper;
using TicketingSystem.Application.Auth;
using TicketingSystem.Application.Epics;
using TicketingSystem.Application.Teams;
using TicketingSystem.Application.Tickets;
using TicketingSystem.Domain.Entities;

namespace TicketingSystem.Application.Common;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<Team, TeamDto>();
        CreateMap<Epic, EpicDto>();
        CreateMap<User, CurrentUserResult>()
            .ForCtorParam(nameof(CurrentUserResult.EmailVerified), opt => opt.MapFrom(u => u.IsEmailVerified));
        CreateMap<User, TicketCreatedByDto>();
        CreateMap<Ticket, TicketDto>();
    }
}
