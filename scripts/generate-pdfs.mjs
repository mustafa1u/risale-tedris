import { mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, parse, resolve } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const assetsRoot = resolve(root, "assets");
const gradeFolders = new Set(["2-sinif", "5-sinif", "8-sinif", "11-sinif", "lisans"]);
const defaultSoffice = process.platform === "win32"
  ? "C:\\Program Files\\LibreOffice\\program\\soffice.exe"
  : "soffice";

const options = parseArgs(process.argv.slice(2));
const soffice = process.env.SOFFICE_PATH ?? defaultSoffice;
const sofficeUserInstallation = process.env.SOFFICE_USER_INSTALLATION;
const mode = options.mode ?? "all";
const force = options.force === true;
const limit = options.limit ? Number(options.limit) : Number.POSITIVE_INFINITY;
const explicitDocxRoot = options["docx-root"] ?? process.env.DOCX_ROOT;
const explicitMobileDocxRoot = options["mobile-docx-root"] ?? process.env.MOBILE_DOCX_ROOT;
const defaultMobileDocxRoot = process.platform === "win32" ? parse(root).root : null;

function parseArgs(args) {
  const result = {};

  for (let index = 0; index < args.length; index += 1) {
    const item = args[index];

    if (item === "--force") {
      result.force = true;
      continue;
    }

    if (item.startsWith("--")) {
      const key = item.slice(2);
      result[key] = args[index + 1];
      index += 1;
    }
  }

  return result;
}

async function listDirectories(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

async function listFiles(path) {
  if (!existsSync(path)) {
    return [];
  }

  const entries = await readdir(path, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
}

function gradeSlugFromCode(code) {
  if (code === "lisans") {
    return "lisans";
  }

  const match = code.match(/^(\d+)sinif$/);
  return match ? `${match[1]}-sinif` : null;
}

function parseDocumentFile(bookSlug, fileName, { mobile }) {
  const header = fileName.match(/^(BK|SK)(6?)_([^_]+)_(.+)\.docx$/i);
  if (!header) {
    return null;
  }

  const hasMobileSuffix = header[2] === "6";
  if (mobile !== hasMobileSuffix) {
    return null;
  }

  const docType = header[1].toUpperCase();
  const gradeSlug = gradeSlugFromCode(header[3]);
  const rest = header[4];
  const escapedBook = bookSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const part = rest.match(new RegExp(`^${escapedBook}-(p\\d+)-(.+)$`));

  if (!gradeSlug || !part) {
    return null;
  }

  return {
    docType,
    gradeSlug,
    partNo: part[1],
    labelSlug: part[2]
  };
}

function mobileDocxRoots(book, grade, gradePath) {
  const roots = [];

  if (explicitDocxRoot) {
    const sourceGradePath = join(resolve(explicitDocxRoot), book, grade);
    roots.push(join(sourceGradePath, "mobile"));
    roots.push(join(sourceGradePath, "mobile", "docx"));
  }

  if (explicitMobileDocxRoot) {
    const sourceGradePath = join(resolve(explicitMobileDocxRoot), book, grade);
    roots.push(join(sourceGradePath, "mobile"));
    roots.push(join(sourceGradePath, "mobile", "docx"));
  }

  roots.push(join(gradePath, "mobile", "docx"));

  if (!explicitMobileDocxRoot && defaultMobileDocxRoot) {
    roots.push(join(defaultMobileDocxRoot, book, grade, "mobile", "docx"));
  }

  return [...new Set(roots)];
}

function run(command, args, options = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      stdio: options.stdio ?? "inherit",
      windowsHide: true
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolveRun();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

function groupBy(items, getKey) {
  const groups = new Map();

  for (const item of items) {
    const key = getKey(item);
    const group = groups.get(key);

    if (group) {
      group.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  return groups;
}

async function collectNormalDocx() {
  const result = [];
  const seenOutputs = new Set();
  const books = await listDirectories(assetsRoot);

  for (const book of books) {
    if (options.book && options.book !== book) {
      continue;
    }

    const bookPath = join(assetsRoot, book);
    const grades = (await listDirectories(bookPath)).filter((folder) => gradeFolders.has(folder));

    for (const grade of grades) {
      if (options.grade && options.grade !== grade) {
        continue;
      }

      const gradePath = join(bookPath, grade);
      const roots = [];

      if (explicitDocxRoot) {
        const sourceGradePath = join(resolve(explicitDocxRoot), book, grade);
        roots.push(sourceGradePath, join(sourceGradePath, "docx"));
      }

      roots.push(gradePath, join(gradePath, "docx"));

      for (const docxRoot of [...new Set(roots)]) {
        const files = (await listFiles(docxRoot)).filter((file) => extname(file).toLowerCase() === ".docx");

        for (const file of files) {
          const parsed = parseDocumentFile(book, file, { mobile: false });
          if (!parsed || parsed.gradeSlug !== grade) {
            continue;
          }

          if (options.type && parsed.docType !== String(options.type).toUpperCase()) {
            continue;
          }

          const pdfName = file.replace(/\.docx$/i, ".pdf");
          const output = join(gradePath, "pdf-normal", pdfName);
          if (seenOutputs.has(output)) {
            continue;
          }

          seenOutputs.add(output);
          result.push({
            input: join(docxRoot, file),
            outputDir: join(gradePath, "pdf-normal"),
            output
          });
        }
      }
    }
  }

  return result.slice(0, limit);
}

async function collectMobileDocx() {
  const result = [];
  const seenOutputs = new Set();
  const books = await listDirectories(assetsRoot);

  for (const book of books) {
    if (options.book && options.book !== book) {
      continue;
    }

    const bookPath = join(assetsRoot, book);
    const grades = (await listDirectories(bookPath)).filter((folder) => gradeFolders.has(folder));

    for (const grade of grades) {
      if (options.grade && options.grade !== grade) {
        continue;
      }

      const gradePath = join(bookPath, grade);

      for (const docxRoot of mobileDocxRoots(book, grade, gradePath)) {
        const files = (await listFiles(docxRoot)).filter((file) => extname(file).toLowerCase() === ".docx");

        for (const file of files) {
          const parsed = parseDocumentFile(book, file, { mobile: true });
          if (!parsed || parsed.gradeSlug !== grade) {
            continue;
          }

          if (options.type && parsed.docType !== String(options.type).toUpperCase()) {
            continue;
          }

          const pdfName = file.replace(/\.docx$/i, ".pdf");
          const output = join(gradePath, "pdf-mobile-6in", pdfName);
          if (seenOutputs.has(output)) {
            continue;
          }

          seenOutputs.add(output);
          result.push({
            input: join(docxRoot, file),
            outputDir: join(gradePath, "pdf-mobile-6in"),
            output
          });
        }
      }
    }
  }

  return result.slice(0, limit);
}

async function generatePdfJobs(jobs, label) {
  const pending = jobs.filter((job) => force || !existsSync(job.output));
  if (pending.length === 0) {
    console.log(`${label} PDFs ready: ${jobs.length}/${jobs.length} already existed.`);
    return;
  }

  const byOutputDir = groupBy(pending, (job) => job.outputDir);

  for (const [outDir, groupedJobs] of byOutputDir) {
    await mkdir(outDir, { recursive: true });

    for (let index = 0; index < groupedJobs.length; index += 20) {
      const chunk = groupedJobs.slice(index, index + 20);
      await run(soffice, [
        ...(sofficeUserInstallation ? [`-env:UserInstallation=${sofficeUserInstallation}`] : []),
        "--headless",
        "--nologo",
        "--nodefault",
        "--nofirststartwizard",
        "--convert-to",
        "pdf",
        "--outdir",
        outDir,
        ...chunk.map((job) => job.input)
      ]);
    }
  }

  console.log(`${label} PDFs ready: ${jobs.length - pending.length}/${jobs.length} already existed, ${pending.length} generated.`);
}

if (!existsSync(soffice)) {
  console.error(`LibreOffice executable not found: ${soffice}`);
  console.error("Set SOFFICE_PATH to the full path of soffice/soffice.exe.");
  process.exit(1);
}

if (!["normal", "mobile", "all"].includes(mode)) {
  console.error(`Unknown PDF generation mode: ${mode}`);
  process.exit(1);
}

const normalJobs = mode === "normal" || mode === "all" ? await collectNormalDocx() : [];
const mobileJobs = mode === "mobile" || mode === "all" ? await collectMobileDocx() : [];

console.log(`PDF generation jobs: ${normalJobs.length} normal, ${mobileJobs.length} mobile.`);
if (mode === "normal" || mode === "all") {
  await generatePdfJobs(normalJobs, "Normal");
}
if (mode === "mobile" || mode === "all") {
  await generatePdfJobs(mobileJobs, "Mobile");
}
