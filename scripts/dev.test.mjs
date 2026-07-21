import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { devProcessSpecs, recoverFailedAstroContentStore, waitForWorker } from "./dev.mjs";

test("development process specs keep the browser on a same-origin API proxy", () => {
  const specs = devProcessSpecs({ root: "C:\\repo", workerUrl: "http://127.0.0.1:5098" });

  assert.equal(specs.worker.command, "dotnet");
  assert.ok(specs.worker.args.includes("http://127.0.0.1:5098"));
  assert.match(specs.web.args[0], /node_modules[\\/]astro[\\/]astro\.js$/);
  assert.equal(specs.workerReadyUrl, "http://127.0.0.1:5098/health/ready");
});

test("worker readiness retries transient connection failures", async () => {
  let attempts = 0;
  const result = await waitForWorker({
    url: "http://worker/health/ready",
    attempts: 3,
    delay: async () => {},
    fetch: async () => {
      attempts += 1;
      if (attempts < 3) throw new TypeError("not listening");
      return { ok: true };
    }
  });

  assert.equal(result, true);
  assert.equal(attempts, 3);
});

test("worker readiness reports failure after the configured attempts", async () => {
  await assert.rejects(
    waitForWorker({
      url: "http://worker/health/ready",
      attempts: 2,
      delay: async () => {},
      fetch: async () => ({ ok: false })
    }),
    /did not become ready/i
  );
});

test("Astro cache recovery skips cleanup when there is no failed temp store", async () => {
  const root = await mkdtemp(join(tmpdir(), "rissor-dev-"));
  try {
    assert.equal(await recoverFailedAstroContentStore({ root }), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Astro cache recovery removes generated content store files after rename failure", async () => {
  const root = await mkdtemp(join(tmpdir(), "rissor-dev-"));
  try {
    const astroDir = join(root, ".astro");
    await mkdir(astroDir, { recursive: true });
    await writeFile(join(astroDir, "data-store.json"), "old-cache");
    await writeFile(join(astroDir, "data-store.json.tmp"), "failed-cache");

    assert.equal(await recoverFailedAstroContentStore({ root, delay: async () => {} }), true);
    assert.equal(await recoverFailedAstroContentStore({ root }), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
