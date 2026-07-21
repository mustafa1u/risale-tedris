import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const astroCommand = process.platform === "win32"
  ? resolve(process.cwd(), "node_modules/.bin/astro.cmd")
  : resolve(process.cwd(), "node_modules/.bin/astro");

const steps = [
  { label: "assets:sync", command: npmCommand, args: ["run", "assets:sync"] },
  { label: "manifest:generate", command: npmCommand, args: ["run", "manifest:generate"] },
  { label: "pdf:validate", command: npmCommand, args: ["run", "pdf:validate"] },
  { label: "astro build", command: astroCommand, args: ["build"] }
];

function runStep(step) {
  return new Promise((resolveStep, rejectStep) => {
    const startedAt = performance.now();
    console.log(`\n[build:timed] Starting ${step.label}`);

    const child = spawn(step.command, step.args, {
      stdio: "inherit",
      shell: process.platform === "win32"
    });

    child.on("error", rejectStep);
    child.on("exit", (code) => {
      const seconds = ((performance.now() - startedAt) / 1000).toFixed(2);

      if (code === 0) {
        console.log(`[build:timed] Completed ${step.label} in ${seconds}s`);
        resolveStep({ label: step.label, seconds: Number(seconds) });
        return;
      }

      rejectStep(new Error(`${step.label} failed with exit code ${code} after ${seconds}s`));
    });
  });
}

export async function runTimedBuild() {
  if (!existsSync(astroCommand)) {
    throw new Error(`Missing local Astro binary: ${astroCommand}`);
  }

  const results = [];
  const startedAt = performance.now();

  for (const step of steps) {
    results.push(await runStep(step));
  }

  const totalSeconds = ((performance.now() - startedAt) / 1000).toFixed(2);

  console.log("\n[build:timed] Summary");
  for (const result of results) {
    console.log(`- ${result.label}: ${result.seconds.toFixed(2)}s`);
  }
  console.log(`- total: ${totalSeconds}s`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runTimedBuild().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
