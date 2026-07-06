using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using TicketingSystem.Application.Common;

namespace TicketingSystem.Api.Middleware;

// Catches every exception that escapes a controller action (in practice: FluentValidation's
// ValidationException from the MediatR pipeline behavior, and the ApiException subclasses
// thrown by command/query handlers) and renders it as the same {success, data, error} shape
// every other response uses.
public class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var (statusCode, error) = Map(exception);

        if (statusCode == StatusCodes.Status500InternalServerError)
            logger.LogError(exception, "Unhandled exception");

        httpContext.Response.StatusCode = statusCode;
        await httpContext.Response.WriteAsJsonAsync(ApiResponse.Fail(error), cancellationToken);
        return true;
    }

    private static (int StatusCode, ApiErrorBody Error) Map(Exception exception) => exception switch
    {
        ValidationException vex => (StatusCodes.Status400BadRequest, new ApiErrorBody(
            "VALIDATION_ERROR",
            "One or more fields are invalid.",
            vex.Errors
                .GroupBy(e => e.PropertyName)
                .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray()))),

        NotFoundException ex => (StatusCodes.Status404NotFound, new ApiErrorBody(ex.Code, ex.Message)),
        ConflictException ex => (StatusCodes.Status409Conflict, new ApiErrorBody(ex.Code, ex.Message)),
        ForbiddenException ex => (StatusCodes.Status403Forbidden, new ApiErrorBody(ex.Code, ex.Message)),
        UnauthorizedException ex => (StatusCodes.Status401Unauthorized, new ApiErrorBody(ex.Code, ex.Message)),
        BadRequestException ex => (StatusCodes.Status400BadRequest, new ApiErrorBody(ex.Code, ex.Message)),

        _ => (StatusCodes.Status500InternalServerError, new ApiErrorBody("INTERNAL_ERROR", "An unexpected error occurred.")),
    };
}
