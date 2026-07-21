using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.RateLimiting;
using Rissor.Augmentation.Core;
using Rissor.Augmentation.Export;

var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.Logging.AddSimpleConsole(options => options.SingleLine = true);
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 256 * 1024);
builder.Services.Configure<FormOptions>(options => options.MultipartBodyLengthLimit = 256 * 1024);
builder.Services.AddSingleton<ExportRequestValidator>();
builder.Services.AddSingleton<CatalogRepository>();
builder.Services.AddSingleton<ExportJobStore>();
builder.Services.AddSingleton<DocumentArtifactGenerator>();
builder.Services.AddHostedService<ExportWorker>();
builder.Services.AddHostedService<ExportCleanupService>();
builder.Services.AddHealthChecks().AddCheck<ExportReadinessCheck>("export-dependencies");
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("export-create", limiter =>
    {
        limiter.PermitLimit = 5;
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.QueueLimit = 0;
        limiter.AutoReplenishment = true;
    });
});

var allowedOrigins = builder.Configuration.GetSection("Augmentation:AllowedOrigins").Get<string[]>() ?? [];
if (allowedOrigins.Length > 0)
{
    builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));
}

var app = builder.Build();
app.UseRateLimiter();
if (allowedOrigins.Length > 0) app.UseCors();
app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false });
app.MapHealthChecks("/health/ready");

app.MapPost("/api/augmentation/exports", async (
    ExportCreateRequest request,
    ExportRequestValidator validator,
    ExportJobStore jobs,
    CancellationToken cancellationToken) =>
{
    var errors = validator.Validate(request);
    if (errors.Count > 0) return Results.ValidationProblem(
        errors.GroupBy(error => error.Code).ToDictionary(
            group => group.Key,
            group => group.Select(error => error.Message).ToArray()));
    var job = await jobs.CreateAsync(request, cancellationToken);
    return Results.Accepted($"/api/augmentation/exports/{job.Id}", job.Snapshot());
}).RequireRateLimiting("export-create");

app.MapGet("/api/augmentation/exports/{id}", (string id, ExportJobStore jobs) =>
{
    var job = jobs.Get(id);
    return job == null ? Results.NotFound() : Results.Ok(job.Snapshot());
});

app.MapDelete("/api/augmentation/exports/{id}", (string id, ExportJobStore jobs) =>
    jobs.Cancel(id) ? Results.NoContent() : Results.NotFound());

app.MapGet("/api/augmentation/exports/{id}/artifacts/{name}", (
    string id,
    string name,
    ExportJobStore jobs) =>
{
    var job = jobs.Get(id);
    var artifact = job?.Status == "ready"
        ? job.Artifacts.SingleOrDefault(item => string.Equals(item.Name, name, StringComparison.Ordinal))
        : null;
    if (artifact == null) return Results.NotFound();
    var path = Path.GetFullPath(Path.Combine(job!.DirectoryPath, artifact.Name));
    if (!path.StartsWith(job.DirectoryPath + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)
        || !File.Exists(path)) return Results.NotFound();
    var contentType = artifact.Format == "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/pdf";
    return Results.File(path, contentType, artifact.Name, enableRangeProcessing: true);
});

app.Run();

public partial class Program;
