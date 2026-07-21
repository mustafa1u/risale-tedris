import assert from "node:assert/strict";
import test from "node:test";

import {
  buildExportRequest,
  clearCachedExportJob,
  createExportJob,
  findExportArtifact,
  pollExportJob,
  readCachedExportJob,
  writeCachedExportJob,
  resolveArtifactUrl
} from "./augmentationExportClient.js";

function projectFixture() {
  return {
    schemaVersion: 1,
    catalogRevision: "catalog-r1",
    id: "project-1",
    title: "P08 + P09",
    homeBookSlug: "book-a",
    basePartKey: "book-a:p08",
    orderedParts: [{ key: "book-a:p08" }, { key: "book-a:p09" }],
    selectedGrades: ["5-sinif", "8-sinif", "11-sinif"],
    gradeResults: {
      "5-sinif": { status: "ready" },
      "8-sinif": { status: "failed" },
      "11-sinif": { status: "ready" }
    }
  };
}

function storageFixture() {
  const values = new Map();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
}

test("export request contains ordered source keys and only requested ready grades", () => {
  const request = buildExportRequest(projectFixture(), { gradeSlugs: ["11-sinif", "8-sinif"] });

  assert.deepEqual(request, {
    schemaVersion: 1,
    catalogRevision: "catalog-r1",
    projectId: "project-1",
    title: "P08 + P09",
    homeBookSlug: "book-a",
    basePartKey: "book-a:p08",
    orderedPartKeys: ["book-a:p08", "book-a:p09"],
    gradeSlugs: ["11-sinif"]
  });
  assert.throws(
    () => buildExportRequest(projectFixture(), { gradeSlugs: ["8-sinif"] }),
    /ready grade/i
  );
});

test("export job cache restores matching reusable jobs only", () => {
  const storage = storageFixture();
  const project = projectFixture();
  const job = {
    id: "job-1",
    status: "ready",
    expiresAt: "2026-07-03T14:30:00.000Z",
    artifacts: [{ name: "file.pdf" }]
  };

  writeCachedExportJob(project, job, { storage });

  assert.deepEqual(
    readCachedExportJob(project, { storage, now: () => Date.parse("2026-07-03T14:00:00.000Z") }),
    job
  );
  assert.equal(readCachedExportJob({ ...project, title: "Changed title" }, { storage }), null);
});

test("export job cache drops expired and explicitly cleared jobs", () => {
  const storage = storageFixture();
  const project = projectFixture();
  const job = {
    id: "job-1",
    status: "running",
    expiresAt: "2026-07-03T14:00:00.000Z",
    artifacts: []
  };

  writeCachedExportJob(project, job, { storage });

  assert.equal(
    readCachedExportJob(project, { storage, now: () => Date.parse("2026-07-03T14:00:01.000Z") }),
    null
  );
  assert.equal(storage.values.size, 0);

  writeCachedExportJob(project, { ...job, expiresAt: "2026-07-03T15:00:00.000Z" }, { storage });
  clearCachedExportJob(project, { storage });

  assert.equal(readCachedExportJob(project, { storage }), null);
});

test("createExportJob posts the compact recipe and returns an accepted job", async () => {
  const calls = [];
  const fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 202,
      json: async () => ({ id: "job-1", status: "queued" })
    };
  };

  const job = await createExportJob(projectFixture(), {
    fetch,
    baseUrl: "https://worker.example/api/augmentation"
  });

  assert.equal(job.id, "job-1");
  assert.equal(calls[0].url, "https://worker.example/api/augmentation/exports");
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].options.body).gradeSlugs, ["5-sinif", "11-sinif"]);
});

test("createExportJob exposes validation details from a rejected request", async () => {
  const fetch = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ errors: { grades: ["No supported grade was selected."] } })
  });

  await assert.rejects(
    createExportJob(projectFixture(), { fetch }),
    /No supported grade was selected/
  );
});

test("pollExportJob reaches ready state without delaying after a terminal response", async () => {
  const states = [
    { id: "job-1", status: "running" },
    { id: "job-1", status: "ready", artifacts: [{ name: "file.pdf" }] }
  ];
  let waits = 0;
  const job = await pollExportJob("job-1", {
    fetch: async () => ({ ok: true, json: async () => states.shift() }),
    intervalMs: 1,
    timeoutMs: 100,
    sleep: async () => { waits += 1; }
  });

  assert.equal(job.status, "ready");
  assert.equal(waits, 1);
});

test("pollExportJob rejects failed terminal state and a timeout", async () => {
  await assert.rejects(
    pollExportJob("job-1", {
      fetch: async () => ({ ok: true, json: async () => ({ status: "failed", error: "LibreOffice failed" }) })
    }),
    /LibreOffice failed/
  );

  for (const status of ["cancelled", "expired"]) {
    await assert.rejects(
      pollExportJob("job-terminal", {
        fetch: async () => ({ ok: true, json: async () => ({ status }) })
      }),
      new RegExp(status)
    );
  }

  await assert.rejects(
    pollExportJob("job-offline", {
      fetch: async () => { throw new TypeError("network offline"); }
    }),
    (error) => error.code === "export-service-unavailable"
      && /unavailable/i.test(error.message)
  );

  let now = 0;
  await assert.rejects(
    pollExportJob("job-2", {
      fetch: async () => ({ ok: true, json: async () => ({ status: "running" }) }),
      intervalMs: 5,
      timeoutMs: 10,
      now: () => now,
      sleep: async (duration) => { now += duration; }
    }),
    /timed out/i
  );
});

test("artifact helpers select an exact document and preserve the worker origin", () => {
  const job = {
    artifacts: [
      { gradeSlug: "5-sinif", documentType: "SK", format: "pdf", url: "/api/augmentation/exports/1/a.pdf" },
      { gradeSlug: "5-sinif", documentType: "BK", format: "mobile-pdf", url: "/api/augmentation/exports/1/b.pdf" }
    ]
  };

  const artifact = findExportArtifact(job, "5-sinif", "BK", "mobile-pdf");
  assert.equal(artifact.url, "/api/augmentation/exports/1/b.pdf");
  assert.equal(
    resolveArtifactUrl(artifact, "https://worker.example/api/augmentation"),
    "https://worker.example/api/augmentation/exports/1/b.pdf"
  );
});
