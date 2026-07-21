import { AUGMENTATION_SCHEMA_VERSION } from "./augmentationContracts.js";

const DEFAULT_MAX_WORKSPACE_BYTES = 25 * 1024 * 1024;

function clone(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function byteLength(value) {
  return new TextEncoder().encode(value).byteLength;
}

function validateProject(project, index) {
  if (!project || typeof project !== "object") {
    throw new Error(`Workspace project ${index + 1} must be an object.`);
  }
  for (const key of ["id", "homeBookSlug", "basePartKey", "title", "catalogRevision"]) {
    if (typeof project[key] !== "string" || project[key].trim() === "") {
      throw new Error(`Workspace project ${index + 1} requires '${key}'.`);
    }
  }
  if (!Array.isArray(project.orderedParts) || !Array.isArray(project.selectedGrades)) {
    throw new Error(`Workspace project ${index + 1} has invalid orderedParts or selectedGrades.`);
  }
}

export function createWorkspace({ catalogRevision, projects, exportedAt = new Date().toISOString() }) {
  if (typeof catalogRevision !== "string" || catalogRevision.trim() === "") {
    throw new Error("Workspace catalogRevision is required.");
  }
  const orderedProjects = [...(projects ?? [])]
    .map(clone)
    .sort((left, right) => String(left.id).localeCompare(String(right.id), "en"));
  orderedProjects.forEach(validateProject);
  return {
    schemaVersion: AUGMENTATION_SCHEMA_VERSION,
    exportedAt,
    catalogRevision,
    projects: orderedProjects
  };
}

export function serializeWorkspace(workspace) {
  const normalized = createWorkspace(workspace);
  return `${JSON.stringify(normalized, null, 2)}\n`;
}

export function parseWorkspace(text, {
  maxBytes = DEFAULT_MAX_WORKSPACE_BYTES,
  currentCatalogRevision
} = {}) {
  const content = String(text ?? "");
  if (byteLength(content) > maxBytes) {
    throw new Error(`Workspace exceeds the maximum size of ${maxBytes} bytes.`);
  }
  let parsed;
  try {
    parsed = JSON.parse(content.replace(/^\uFEFF/u, ""));
  } catch {
    throw new Error("Workspace must be valid JSON.");
  }
  if (parsed?.schemaVersion > AUGMENTATION_SCHEMA_VERSION) {
    throw new Error(`This file uses a newer workspace schema (${parsed.schemaVersion}).`);
  }
  if (parsed?.schemaVersion !== AUGMENTATION_SCHEMA_VERSION) {
    throw new Error(`Unsupported workspace schema: ${parsed?.schemaVersion ?? "missing"}.`);
  }
  if (typeof parsed.catalogRevision !== "string" || !Array.isArray(parsed.projects)) {
    throw new Error("Workspace catalogRevision and projects are required.");
  }
  parsed.projects.forEach(validateProject);
  const result = clone(parsed);
  if (currentCatalogRevision && currentCatalogRevision !== result.catalogRevision) {
    result.catalogMismatch = true;
  }
  return result;
}

export function mergeWorkspaceProjects(existingProjects, importedProjects, {
  strategy = "skip",
  createId = () => crypto.randomUUID()
} = {}) {
  if (!["skip", "replace", "copy"].includes(strategy)) {
    throw new Error(`Unsupported workspace conflict strategy: ${strategy}.`);
  }
  const projects = [...(existingProjects ?? [])].map(clone);
  const indexById = new Map(projects.map((project, index) => [project.id, index]));
  const conflicts = [];

  for (const importedProject of importedProjects ?? []) {
    validateProject(importedProject, 0);
    const existingIndex = indexById.get(importedProject.id);
    if (existingIndex === undefined) {
      indexById.set(importedProject.id, projects.length);
      projects.push(clone(importedProject));
      continue;
    }

    conflicts.push(importedProject.id);
    if (strategy === "skip") {
      continue;
    }
    if (strategy === "replace") {
      projects[existingIndex] = clone(importedProject);
      continue;
    }

    const copy = clone(importedProject);
    copy.id = createId();
    copy.title = `${copy.title} (copy)`;
    delete copy.revision;
    delete copy.createdAt;
    delete copy.updatedAt;
    indexById.set(copy.id, projects.length);
    projects.push(copy);
  }

  return { projects, conflicts };
}

