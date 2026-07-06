namespace TicketingSystem.Application.Common;

// Thrown by command/query handlers for expected business-rule failures; caught centrally by
// GlobalExceptionHandler (Api layer) and mapped to the matching HTTP status + ApiResponse body.
// FluentValidation's own ValidationException (thrown by the pipeline behavior for malformed
// input) is handled separately, alongside these.
public abstract class ApiException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}

public class NotFoundException(string code, string message) : ApiException(code, message);

public class ConflictException(string code, string message) : ApiException(code, message);

public class BadRequestException(string code, string message) : ApiException(code, message);

public class ForbiddenException(string code, string message) : ApiException(code, message);

public class UnauthorizedException(string code, string message) : ApiException(code, message);
