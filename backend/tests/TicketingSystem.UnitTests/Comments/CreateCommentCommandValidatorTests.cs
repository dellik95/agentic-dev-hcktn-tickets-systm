using TicketingSystem.Application.Comments.Commands;

namespace TicketingSystem.UnitTests.Comments;

public class CreateCommentCommandValidatorTests
{
    private readonly CreateCommentCommandValidator _validator = new();

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Validate_Fails_ForEmptyOrWhitespaceBody(string body)
    {
        var result = _validator.Validate(new CreateCommentCommand(Guid.NewGuid(), Guid.NewGuid(), body));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Validate_Succeeds_ForNonEmptyBody()
    {
        var result = _validator.Validate(new CreateCommentCommand(Guid.NewGuid(), Guid.NewGuid(), "Some comment body"));

        Assert.True(result.IsValid);
    }
}
