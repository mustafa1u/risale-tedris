using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Rissor.Augmentation.Export;

public sealed class ExportReadinessCheck(
    CatalogRepository catalog,
    DocumentArtifactGenerator generator) : IHealthCheck
{
    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var catalogPath = Path.Combine(catalog.AssetsRoot, "augmentation-catalog.json");
        if (!File.Exists(catalogPath))
            return Task.FromResult(HealthCheckResult.Unhealthy("Augmentation catalog is missing."));
        if (Path.IsPathFullyQualified(generator.SofficePath) && !File.Exists(generator.SofficePath))
            return Task.FromResult(HealthCheckResult.Unhealthy("LibreOffice is missing."));
        return Task.FromResult(HealthCheckResult.Healthy());
    }
}
