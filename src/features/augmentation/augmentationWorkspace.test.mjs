import assert from "node:assert/strict";
import test from "node:test";
import {
  createWorkspace,
  mergeWorkspaceProjects,
  parseWorkspace,
  serializeWorkspace
} from "./augmentationWorkspace.js";

function project(id, title = `Project ${id}`) {
  return {
    schemaVersion: 1,
    id,
    homeBookSlug: "book-a",
    basePartKey: "book-a:p08",
    title,
    catalogRevision: "catalog-a",
    orderedParts: [{ key: "book-a:p08" }],
    selectedGrades: ["5-sinif"],
    gradeResults: {}
  };
}

test("workspace serialization is versioned and deterministic", () => {
  const workspace = createWorkspace({
    catalogRevision: "catalog-a",
    projects: [project("b"), project("a")],
    exportedAt: "2026-06-27T12:00:00.000Z"
  });
  const first = serializeWorkspace(workspace);
  const second = serializeWorkspace(createWorkspace({
    catalogRevision: "catalog-a",
    projects: [project("a"), project("b")],
    exportedAt: "2026-06-27T12:00:00.000Z"
  }));

  assert.equal(first, second);
  assert.deepEqual(parseWorkspace(first), workspace);
});

test("workspace parsing rejects malformed, oversized, and future schemas", () => {
  assert.throws(() => parseWorkspace("not-json"), /valid JSON/);
  assert.throws(
    () => parseWorkspace(JSON.stringify({ schemaVersion: 99, projects: [] })),
    /newer workspace schema/
  );
  assert.throws(() => parseWorkspace("{}", { maxBytes: 1 }), /maximum size/);
  assert.throws(
    () => parseWorkspace(JSON.stringify({ schemaVersion: 1, catalogRevision: "catalog", projects: [{ id: "bad" }] })),
    /homeBookSlug/
  );
});

test("workspace conflict policies support skip, replace, and safe copies", () => {
  const existing = [project("same", "Existing")];
  const imported = [project("same", "Imported"), project("new")];

  assert.deepEqual(
    mergeWorkspaceProjects(existing, imported, { strategy: "skip" }).projects.map((item) => item.title),
    ["Existing", "Project new"]
  );
  assert.deepEqual(
    mergeWorkspaceProjects(existing, imported, { strategy: "replace" }).projects.map((item) => item.title),
    ["Imported", "Project new"]
  );
  const copied = mergeWorkspaceProjects(existing, imported, {
    strategy: "copy",
    createId: () => "copy-id"
  });
  assert.deepEqual(copied.projects.map((item) => item.id), ["same", "copy-id", "new"]);
  assert.equal(copied.projects[1].title, "Imported (copy)");
});

test("untrusted text remains plain data and catalog mismatches are reported", () => {
  const unsafe = project("unsafe", "<script>alert(1)</script>");
  const parsed = parseWorkspace(serializeWorkspace(createWorkspace({
    catalogRevision: "old-catalog",
    projects: [unsafe],
    exportedAt: "2026-06-27T12:00:00.000Z"
  })), { currentCatalogRevision: "new-catalog" });

  assert.equal(parsed.projects[0].title, "<script>alert(1)</script>");
  assert.equal(parsed.catalogMismatch, true);
});
