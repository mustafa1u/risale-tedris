import { spawn } from "node:child_process";
import { constants as fsConstants, promises as fs } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_WORKER_URL = "http://127.0.0.1:5098";

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

export function devProcessSpecs({
  root = process.cwd(),
  workerUrl = process.env.AUGMENTATION_EXPORT_WORKER_URL ?? DEFAULT_WORKER_URL
} = {}) {
  const normalizedWorkerUrl = trimTrailingSlash(workerUrl);
  return {
    workerReadyUrl: `${normalizedWorkerUrl}/health/ready`,
    worker: {
      command: "dotnet",
      args: [
        "run",
        "--project",
        resolve(root, "services", "Rissor.Augmentation.Export", "Rissor.Augmentation.Export.csproj"),
        "--urls",
        normalizedWorkerUrl
      ]
    },
    web: {
      command: process.execPath,
      args: [
        resolve(root, "node_modules", "astro", "astro.js"),
        "dev",
        "--host",
        "127.0.0.1"
      ],
      env: {
        ...process.env,
        AUGMENTATION_EXPORT_WORKER_URL: normalizedWorkerUrl,
        PUBLIC_AUGMENTATION_EXPORT_API: "/api/augmentation"
      }
    }
  };
}

export async function workerIsReady({
  url,
  fetch = globalThis.fetch
}) {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
}

export async function waitForWorker({
  url,
  fetch = globalThis.fetch,
  attempts = 120,
  delay = (duration) => new Promise((resolveDelay) => setTimeout(resolveDelay, duration)),
  delayMs = 1000,
  exited = () => false
}) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await workerIsReady({ url, fetch })) return true;
    if (exited()) throw new Error("The augmentation export worker exited before becoming ready.");
    if (attempt + 1 < attempts) await delay(delayMs);
  }
  throw new Error(`The augmentation export worker did not become ready at ${url}.`);
}

async function fileExists(filePath, access) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function removeGeneratedFileWithRetries({
  filePath,
  rmFile,
  delay,
  attempts,
  delayMs
}) {
  const maxAttempts = Math.max(1, attempts);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      await rmFile(filePath, { force: true });
      return;
    } catch (error) {
      if (error?.code === "ENOENT") return;
      if (attempt + 1 >= maxAttempts) throw error;
      await delay(delayMs);
    }
  }
}

export async function recoverFailedAstroContentStore({
  root = process.cwd(),
  access = fs.access,
  rmFile = fs.rm,
  delay = (duration) => new Promise((resolveDelay) => setTimeout(resolveDelay, duration)),
  attempts = 5,
  delayMs = 100
} = {}) {
  const storePath = resolve(root, ".astro", "data-store.json");
  const tempPath = `${storePath}.tmp`;

  if (!await fileExists(tempPath, access)) return false;

  await removeGeneratedFileWithRetries({ filePath: tempPath, rmFile, delay, attempts, delayMs });
  await removeGeneratedFileWithRetries({ filePath: storePath, rmFile, delay, attempts, delayMs });
  return true;
}

function spawnProcess(spec) {
  return spawn(spec.command, spec.args, {
    cwd: process.cwd(),
    env: spec.env ?? process.env,
    stdio: "inherit",
    windowsHide: true
  });
}

async function runDevelopment() {
  const specs = devProcessSpecs();
  let worker = null;
  let web = null;
  let stopping = false;
  let astroRecoveryAttempted = false;

  const stop = (exitCode = 0) => {
    if (stopping) return;
    stopping = true;
    if (web?.exitCode === null) web.kill();
    if (worker?.exitCode === null) worker.kill();
    process.exitCode = exitCode;
  };

  process.once("SIGINT", () => stop(0));
  process.once("SIGTERM", () => stop(0));

  if (!await workerIsReady({ url: specs.workerReadyUrl })) {
    console.log("Starting augmentation export worker...");
    worker = spawnProcess(specs.worker);
    worker.once("error", (error) => {
      console.error(`Could not start export worker: ${error.message}`);
      stop(1);
    });
    try {
      await waitForWorker({
        url: specs.workerReadyUrl,
        exited: () => worker.exitCode !== null
      });
    } catch (error) {
      if (worker.exitCode === null) worker.kill();
      throw error;
    }
  } else {
    console.log(`Using the augmentation export worker already ready at ${specs.workerReadyUrl}.`);
  }

  console.log("Export worker is ready. Starting Astro...");
  const startAstro = () => {
    web = spawnProcess(specs.web);
    web.once("error", (error) => {
      console.error(`Could not start Astro: ${error.message}`);
      stop(1);
    });
    web.once("exit", async (code) => {
      if (stopping) return;
      if (code !== 0 && !astroRecoveryAttempted) {
        astroRecoveryAttempted = true;
        try {
          if (await recoverFailedAstroContentStore()) {
            console.warn("Astro hit a generated content cache lock. Cleared .astro/data-store.json and retrying Astro once...");
            startAstro();
            return;
          }
        } catch (error) {
          console.error(`Could not clear Astro content cache after startup failure: ${error.message}`);
          stop(1);
          return;
        }
      }
      stop(code ?? 0);
    });
  };

  startAstro();
  worker?.once("exit", (code) => {
    if (!stopping) {
      console.error(`Augmentation export worker stopped unexpectedly (exit ${code ?? "unknown"}).`);
      stop(code || 1);
    }
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runDevelopment().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
