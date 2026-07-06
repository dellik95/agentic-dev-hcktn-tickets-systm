using FluentValidation;
using MediatR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TicketingSystem.Application.Auth;
using TicketingSystem.Application.Common.Behaviors;
using TicketingSystem.Application.Common;
using TicketingSystem.Application.Options;
using TicketingSystem.Infrastructure.Auth;
using TicketingSystem.Infrastructure.Email;

namespace TicketingSystem.Infrastructure;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.Configure<SmtpOptions>(configuration.GetSection(SmtpOptions.SectionName));
        services.Configure<FrontendOptions>(configuration.GetSection(FrontendOptions.SectionName));

        services.AddScoped<IPasswordHasher, Argon2PasswordHasher>();
        services.AddScoped<IEmailSender, SmtpEmailSender>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();

        // CQRS: commands/queries + validators live in Application; handlers (need the DbContext)
        // live here in Infrastructure. Both assemblies are scanned so MediatR/FluentValidation
        // find everything regardless of which project a given piece lives in.
        var applicationAssembly = typeof(AuthErrorCodes).Assembly;
        var infrastructureAssembly = typeof(ServiceCollectionExtensions).Assembly;

        services.AddMediatR(cfg => cfg.RegisterServicesFromAssemblies(applicationAssembly, infrastructureAssembly));
        services.AddValidatorsFromAssembly(applicationAssembly);
        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));

        services.AddAutoMapper(typeof(MappingProfile).Assembly);

        return services;
    }
}
