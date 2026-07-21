const configuredApiBase = import.meta.env?.PUBLIC_AUGMENTATION_EXPORT_API;

export const DEFAULT_AUGMENTATION_EXPORT_API = configuredApiBase || "/api/augmentation";
const EXPORT_JOB_CACHE_PREFIX = "rissor-ag-augmentation-export:";
const EXPORT_JOB_CACHE_SCHEMA_VERSION = 1;

export class AugmentationExportConnectionError extends Error {
  constructor(cause) {
    super("The document export service is unavailable.", { cause });
    this.name = "AugmentationExportConnectionError";
    this.code = "export-service-unavailable";
  }
}

function normalizeBaseUrl(baseUrl) {
  return (baseUrl || DEFAULT_AUGMENTATION_EXPORT_API).replace(/\/+$/, "");
}

function errorMessage(payload, status) {
  const details = Object.values(payload?.errors ?? {}).flat().filter(Boolean);
  return details.join(" ") || payload?.detail || payload?.title || payload?.error
    || `Document export request failed: ${status}.`;
}

async function readPayload(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function requestExport(fetch, url, options) {
  try {
    return await fetch(url, options);
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new AugmentationExportConnectionError(error);
  }
}

export function buildExportRequest(project, { gradeSlugs } = {}) {
  if (!project?.id || !project.catalogRevision || !project.basePartKey) {
    throw new Error("The augmentation project is incomplete.");
  }
  const requested = new Set(gradeSlugs ?? project.selectedGrades ?? []);
  const readyGrades = (project.selectedGrades ?? Object.keys(project.gradeResults ?? {}))
    .filter((gradeSlug) => requested.has(gradeSlug) && project.gradeResults?.[gradeSlug]?.status === "ready");
  if (readyGrades.length === 0) {
    throw new Error("At least one ready grade is required for document export.");
  }
  return {
    schemaVersion: project.schemaVersion,
    catalogRevision: project.catalogRevision,
    projectId: project.id,
    title: project.title,
    homeBookSlug: project.homeBookSlug,
    basePartKey: project.basePartKey,
    orderedPartKeys: project.orderedParts.map((part) => part.key),
    gradeSlugs: readyGrades
  };
}

function exportCacheKey(projectId) {
  return `${EXPORT_JOB_CACHE_PREFIX}${encodeURIComponent(projectId)}`;
}

function exportRequestSignature(project, { gradeSlugs } = {}) {
  return JSON.stringify(buildExportRequest(project, { gradeSlugs }));
}

function isReusableExportJob(job) {
  return Boolean(job?.id && ["queued", "running", "ready"].includes(job.status));
}

function isExpiredExportJob(job, now) {
  const expiresAt = Date.parse(job?.expiresAt ?? "");
  return Number.isFinite(expiresAt) && expiresAt <= now();
}

export function readCachedExportJob(project, {
  gradeSlugs,
  storage = globalThis.localStorage,
  now = Date.now
} = {}) {
  if (!project?.id || !storage?.getItem) {
    return null;
  }
  const key = exportCacheKey(project.id);
  try {
    const raw = storage.getItem(key);
    if (!raw) {
      return null;
    }
    const cached = JSON.parse(raw);
    if (
      cached?.schemaVersion !== EXPORT_JOB_CACHE_SCHEMA_VERSION
      || cached.requestSignature !== exportRequestSignature(project, { gradeSlugs })
      || !isReusableExportJob(cached.job)
      || isExpiredExportJob(cached.job, now)
    ) {
      storage.removeItem?.(key);
      return null;
    }
    return cached.job;
  } catch {
    return null;
  }
}

export function writeCachedExportJob(project, job, {
  gradeSlugs,
  storage = globalThis.localStorage
} = {}) {
  if (!project?.id || !storage?.setItem || !isReusableExportJob(job)) {
    return;
  }
  try {
    storage.setItem(exportCacheKey(project.id), JSON.stringify({
      schemaVersion: EXPORT_JOB_CACHE_SCHEMA_VERSION,
      requestSignature: exportRequestSignature(project, { gradeSlugs }),
      cachedAt: new Date().toISOString(),
      job
    }));
  } catch {
    // Export links are still usable in memory; cache failures should not block document preparation.
  }
}

export function clearCachedExportJob(projectOrId, {
  storage = globalThis.localStorage
} = {}) {
  const projectId = typeof projectOrId === "string" ? projectOrId : projectOrId?.id;
  if (!projectId || !storage?.removeItem) {
    return;
  }
  try {
    storage.removeItem(exportCacheKey(projectId));
  } catch {
    // Ignore unavailable or restricted storage.
  }
}

export async function createExportJob(project, {
  gradeSlugs,
  fetch = globalThis.fetch,
  baseUrl = DEFAULT_AUGMENTATION_EXPORT_API,
  signal
} = {}) {
  const response = await requestExport(fetch, `${normalizeBaseUrl(baseUrl)}/exports`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(buildExportRequest(project, { gradeSlugs })),
    signal
  });
  const payload = await readPayload(response);
  if (!response.ok || !payload?.id) {
    throw new Error(errorMessage(payload, response.status));
  }
  return payload;
}

export async function getExportJob(jobId, {
  fetch = globalThis.fetch,
  baseUrl = DEFAULT_AUGMENTATION_EXPORT_API,
  signal
} = {}) {
  const response = await requestExport(
    fetch,
    `${normalizeBaseUrl(baseUrl)}/exports/${encodeURIComponent(jobId)}`,
    { signal }
  );
  const payload = await readPayload(response);
  if (!response.ok) {
    throw new Error(errorMessage(payload, response.status));
  }
  return payload;
}

export async function pollExportJob(jobId, {
  fetch = globalThis.fetch,
  baseUrl = DEFAULT_AUGMENTATION_EXPORT_API,
  signal,
  intervalMs = 1000,
  timeoutMs = 180_000,
  now = Date.now,
  sleep = (duration) => new Promise((resolve) => setTimeout(resolve, duration))
} = {}) {
  const startedAt = now();
  while (true) {
    const job = await getExportJob(jobId, { fetch, baseUrl, signal });
    if (job.status === "ready") {
      return job;
    }
    if (["failed", "cancelled", "expired"].includes(job.status)) {
      throw new Error(job.error || `Document export ended with status '${job.status}'.`);
    }
    if (now() - startedAt >= timeoutMs) {
      throw new Error("Document export timed out.");
    }
    await sleep(intervalMs);
  }
}

export function findExportArtifact(job, gradeSlug, documentType, format) {
  return job?.artifacts?.find((artifact) => artifact.gradeSlug === gradeSlug
    && artifact.documentType === documentType
    && artifact.format === format) ?? null;
}

export function resolveArtifactUrl(artifact, baseUrl = DEFAULT_AUGMENTATION_EXPORT_API) {
  if (!artifact?.url) {
    return null;
  }
  if (/^https?:\/\//i.test(artifact.url)) {
    return artifact.url;
  }
  const normalizedBase = normalizeBaseUrl(baseUrl);
  if (/^https?:\/\//i.test(normalizedBase)) {
    return new URL(artifact.url, new URL(normalizedBase).origin).toString();
  }
  const origin = globalThis.location?.origin;
  return origin ? new URL(artifact.url, origin).toString() : artifact.url;
}
