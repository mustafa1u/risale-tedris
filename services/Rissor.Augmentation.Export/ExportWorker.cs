namespace Rissor.Augmentation.Export;

public sealed class ExportWorker(
    ExportJobStore jobs,
    CatalogRepository catalog,
    DocumentArtifactGenerator generator,
    ILogger<ExportWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var id in jobs.Reader.ReadAllAsync(stoppingToken))
        {
            var job = jobs.Get(id);
            if (job == null || job.Status == "cancelled") continue;
            using var linked = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken, job.Cancellation.Token);
            try
            {
                SetStatus(job, "running");
                var input = await catalog.LoadAsync(job.Request, linked.Token);
                var artifacts = await generator.GenerateAsync(job, input, linked.Token);
                lock (job.SyncRoot)
                {
                    job.Artifacts = [.. artifacts];
                    job.Status = "ready";
                    job.UpdatedAt = DateTimeOffset.UtcNow;
                    job.ExpiresAt = DateTimeOffset.UtcNow.AddHours(1);
                }
            }
            catch (OperationCanceledException) when (job.Cancellation.IsCancellationRequested)
            {
                SetStatus(job, "cancelled");
                TryDelete(job.DirectoryPath);
            }
            catch (Exception error)
            {
                lock (job.SyncRoot)
                {
                    job.Status = "failed";
                    job.Error = error.Message;
                    job.UpdatedAt = DateTimeOffset.UtcNow;
                    job.ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(15);
                }
                try { logger.LogError(error, "Augmentation export job {JobId} failed", job.Id); }
                catch { }
                TryDelete(job.DirectoryPath);
            }
        }
    }

    private static void SetStatus(ExportJob job, string status)
    {
        lock (job.SyncRoot)
        {
            job.Status = status;
            job.UpdatedAt = DateTimeOffset.UtcNow;
        }
    }

    private static void TryDelete(string path)
    {
        try { if (Directory.Exists(path)) Directory.Delete(path, recursive: true); }
        catch { }
    }
}

public sealed class ExportCleanupService(ExportJobStore jobs) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(5));
        while (await timer.WaitForNextTickAsync(stoppingToken)) jobs.CleanupExpired();
    }
}
