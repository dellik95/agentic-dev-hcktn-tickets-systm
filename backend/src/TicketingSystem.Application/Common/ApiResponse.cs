namespace TicketingSystem.Application.Common;

public record ApiErrorBody(string Code, string Message, IDictionary<string, string[]>? FieldErrors = null);

// Every API response — success or failure — has this same {success, data, error} shape.
public class ApiResponse
{
    public bool Success { get; init; }
    public ApiErrorBody? Error { get; init; }

    public static ApiResponse Ok() => new() { Success = true };
    public static ApiResponse<T> Ok<T>(T data) => new() { Success = true, Data = data };
    public static ApiResponse Fail(ApiErrorBody error) => new() { Success = false, Error = error };
}

public class ApiResponse<T> : ApiResponse
{
    public T? Data { get; init; }
}
