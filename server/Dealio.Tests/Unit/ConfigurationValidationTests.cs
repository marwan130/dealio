namespace Dealio.Tests.Unit;

using FluentAssertions;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Dealio.API.Extensions;

public sealed class ConfigurationValidationTests
{
    private static WebApplicationBuilder CreateProductionBuilder(
        Action<Dictionary<string, string?>>? configure = null)
    {
        var builder = WebApplication.CreateBuilder();
        builder.Environment.EnvironmentName = "Production";

        var values = new Dictionary<string, string?>
        {
            ["ConnectionStrings:Default"] = "Host=localhost;Database=dealio",
            ["Jwt:Secret"] = new('s', 48),
            ["InternalApi:Key"] = new('k', 24),
            ["Hangfire:DashboardApiKey"] = new('h', 24),
            ["Brevo:ApiKey"] = "brevo-key",
            ["Brevo:SenderEmail"] = "no-reply@example.com",
            ["Frontend:BaseUrl"] = "https://dealio.example",
            ["AllowedHosts"] = "dealio.example",
            ["Cors:AllowedOrigins:0"] = "https://dealio.example"
        };
        configure?.Invoke(values);

        builder.Configuration.AddInMemoryCollection(values);
        return builder;
    }

    private static string Validate(WebApplicationBuilder builder)
    {
        try
        {
            builder.ValidateProductionSettings();
            return string.Empty;
        }
        catch (InvalidOperationException ex)
        {
            return ex.Message;
        }
    }

    [Fact]
    public void BrevoConfigured_DoesNotRequireSmtpFallback()
    {
        var message = Validate(CreateProductionBuilder());

        message.Should().BeEmpty(
            "SMTP is only the fallback when no Brevo key is configured");
    }

    [Fact]
    public void BrevoConfiguredWithoutSenderEmail_IsRejected()
    {
        var message = Validate(CreateProductionBuilder(v => v["Brevo:SenderEmail"] = null));

        message.Should().Contain("Brevo:SenderEmail");
    }

    [Fact]
    public void NoBrevo_RequiresFullSmtpFallback()
    {
        var message = Validate(CreateProductionBuilder(v =>
        {
            v["Brevo:ApiKey"] = null;
            v["Brevo:SenderEmail"] = null;
            // Null out all four: machine environment variables (e.g. a real
            // SMTP_HOST on the dev machine) must not leak into the test.
            v["Smtp:Host"] = null;
            v["Smtp:Username"] = null;
            v["Smtp:Password"] = null;
            v["Smtp:From"] = null;
        }));

        message.Should().Contain("Smtp:Host").And.Contain("Smtp:Username")
            .And.Contain("Smtp:Password").And.Contain("Smtp:From");
    }

    [Fact]
    public void InvalidQuota_DoesNotSkipTheSmtpCheck()
    {
        var message = Validate(CreateProductionBuilder(v =>
        {
            v["Brevo:ApiKey"] = null;
            v["Brevo:SenderEmail"] = null;
            v["Smtp:Host"] = null;
            v["Smtp:Username"] = null;
            v["Smtp:Password"] = null;
            v["Smtp:From"] = null;
            v["ProductDiscovery:Tavily:MonthlyQuota"] = "not-a-number";
        }));

        message.Should().Contain("MonthlyQuota")
            .And.Contain("Smtp:Host",
                "the SMTP fallback check must run even when another value is invalid");
    }

    [Fact]
    public void QuotaBoundaries_AcceptEmptyZeroAndMax_RejectOutOfRange()
    {
        Validate(CreateProductionBuilder()).Should().BeEmpty();

        Validate(CreateProductionBuilder(
            v => v["ProductDiscovery:Tavily:MonthlyQuota"] = "")).Should().BeEmpty(
            "an empty quota means the discovery feature is disabled");

        Validate(CreateProductionBuilder(
            v => v["ProductDiscovery:Tavily:MonthlyQuota"] = "0")).Should().BeEmpty();

        Validate(CreateProductionBuilder(
            v => v["ProductDiscovery:Tavily:MonthlyQuota"] = "1000")).Should().BeEmpty();

        Validate(CreateProductionBuilder(
            v => v["ProductDiscovery:Tavily:MonthlyQuota"] = "1001")).Should()
            .Contain("MonthlyQuota");

        Validate(CreateProductionBuilder(
            v => v["ProductDiscovery:Tavily:MonthlyQuota"] = "-1")).Should()
            .Contain("MonthlyQuota");
    }
}
