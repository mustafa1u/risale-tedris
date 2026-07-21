using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Channels;
using Rissor.Augmentation.Core;

namespace Rissor.Augmentation.Export;

public sealed record ExportArtifact(
    string Name,
    string GradeSlug,
    string DocumentType,
    string Format,
    long Size,
    string Url);

public sealed record ExportJobSnapshot(
    string Id,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset ExpiresAt,
    string? Error,
    IReadOnlyList<ExportArtifact> Artifacts);

public sealed class ExportJob
{
    public required string Id { get; init; }
    public required string RequestHash { get; init; }
    public required ExportCreateRequest Request { get; init; }
    public required string DirectoryPath { get; init; }
    public string Status { get; set; } = "queued";
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ExpiresAt { get; set; } = DateTimeOffset.UtcNow.AddHours(1);
    public string? Error { get; set; }
    public List<ExportArtifact> Artifacts { get; set; } = [];
    public CancellationTokenSource Cancellation { get; } = new();
    public object SyncRoot { get; } = new();

    public ExportJobSnapshot Snapshot()
    {
        lock (SyncRoot)
            return new(Id, Status, CreatedAt, UpdatedAt, ExpiresAt, Error, [.. Artifacts]);
    }
}

public sealed class ExportJobStore
{
    private readonly ConcurrentDictionary<string, ExportJob> _jobs = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, string> _jobsByHash = new(StringComparer.Ordinal);
    private readonly Channel<string> _queue = Channel.CreateBounded<string>(new BoundedChannelOptions(100)
    {
        FullMode = BoundedChannelFullMode.Wait,
        SingleReader = true,
        SingleWriter = false
    });
    private readonly string _jobRoot;

    public ExportJobStore(IConfiguration configuration, IWebHostEnvironment environment)
    {
        var configuredRoot = configuration["Augmentation:JobRoot"];
        _jobRoot = Path.GetFullPath(string.IsNullOrWhiteSpace(configuredRoot)
            ? Path.Combine(environment.ContentRootPath, "jobs")
            : Path.IsPathFullyQualified(configuredRoot)
                ? configuredRoot
                : Path.Combine(environment.ContentRootPath, configuredRoot));
        Directory.CreateDirectory(_jobRoot);
        foreach (var directory in Directory.EnumerateDirectories(_jobRoot))
            TryDeleteDirectory(directory);
    }

    public async Task<ExportJob> CreateAsync(ExportCreateRequest request, CancellationToken cancellationToken)
    {
        var hash = Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(
            JsonSerializer.Serialize(request, new JsonSerializerOptions(JsonSerializerDefaults.Web)))));
        if (_jobsByHash.TryGetValue(hash, out var existingId)
            && _jobs.TryGetValue(existingId, out var existing)
            && existing.ExpiresAt > DateTimeOffset.UtcNow
            && existing.Status is not "failed" and not "cancelled" and not "expired")
            return existing;

        var id = Guid.NewGuid().ToString("N");
        var path = Path.GetFullPath(Path.Combine(_jobRoot, id));
        if (!path.StartsWith(_jobRoot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Job directory escaped its configured root.");
        var job = new ExportJob { Id = id, RequestHash = hash, Request = request, DirectoryPath = path };
        if (!_jobs.TryAdd(id, job)) throw new InvalidOperationException("Could not allocate an export job.");
        _jobsByHash[hash] = id;
        try
        {
            await _queue.Writer.WriteAsync(id, cancellationToken);
        }
        catch
        {
            _jobs.TryRemove(id, out _);
            _jobsByHash.TryRemove(hash, out _);
            throw;
        }
        return job;
    }

    public ExportJob? Get(string id) => _jobs.TryGetValue(id, out var job) ? job : null;
    public ChannelReader<string> Reader => _queue.Reader;

    public bool Cancel(string id)
    {
        if (!_jobs.TryGetValue(id, out var job)) return false;
        lock (job.SyncRoot)
        {
            if (job.Status is "ready" or "failed" or "expired" or "cancelled") return false;
            job.Status = "cancelled";
            job.UpdatedAt = DateTimeOffset.UtcNow;
            job.Cancellation.Cancel();
            return true;
        }
    }

    public void CleanupExpired()
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var pair in _jobs)
        {
            var job = pair.Value;
            if (job.ExpiresAt > now) continue;
            lock (job.SyncRoot)
            {
                job.Status = "expired";
                job.Artifacts.Clear();
            }
            TryDeleteDirectory(job.DirectoryPath);
            _jobs.TryRemove(pair.Key, out _);
            _jobsByHash.TryRemove(job.RequestHash, out _);
        }
        foreach (var directory in Directory.EnumerateDirectories(_jobRoot))
        {
            var info = new DirectoryInfo(directory);
            if (info.LastWriteTimeUtc < DateTime.UtcNow.AddHours(-2)) TryDeleteDirectory(directory);
        }
    }

    private static void TryDeleteDirectory(string path)
    {
        try { if (Directory.Exists(path)) Directory.Delete(path, recursive: true); }
        catch { }
    }
}
