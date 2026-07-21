import assert from "node:assert/strict";
import test from "node:test";
import { indexedDB } from "fake-indexeddb";
import {
  AugmentationConflictError,
  createAugmentationNotifier,
  createAugmentationStorage,
  deleteAugmentationDatabase,
  requestAugmentationPersistence
} from "./augmentationStorage.js";

test("storage persistence is best-effort and reports unsupported or denied states", async () => {
  assert.equal(await requestAugmentationPersistence(null), "unsupported");
  assert.equal(await requestAugmentationPersistence({ persist: async () => false }), "denied");
  assert.equal(await requestAugmentationPersistence({ persist: async () => true }), "granted");
});

test("unavailable IndexedDB fails explicitly without creating volatile replacement state", async () => {
  const storage = createAugmentationStorage({ indexedDB: null });
  await assert.rejects(storage.listProjects(), /IndexedDB is unavailable/);
  storage.close();
});

test("cross-tab notifier publishes project invalidations", () => {
  const sent = [];
  class FakeChannel {
    postMessage(message) { sent.push(message); }
    addEventListener(_name, listener) { this.listener = listener; }
    removeEventListener() {}
    close() {}
  }
  const notifier = createAugmentationNotifier({ BroadcastChannel: FakeChannel });
  const received = [];
  const unsubscribe = notifier.subscribe((message) => received.push(message));
  notifier.publish({ type: "project-updated", projectId: "one" });
  notifier.channel.listener({ data: { type: "project-deleted", projectId: "two" } });
  unsubscribe();
  notifier.close();
  assert.deepEqual(sent, [{ type: "project-updated", projectId: "one" }]);
  assert.deepEqual(received, [{ type: "project-deleted", projectId: "two" }]);
});

function makeProject(id, homeBookSlug = "book-a") {
  return {
    schemaVersion: 1,
    id,
    homeBookSlug,
    basePartKey: `${homeBookSlug}:p08`,
    title: `Project ${id}`,
    catalogRevision: "catalog-1",
    orderedParts: [],
    selectedGrades: ["5-sinif"],
    gradeResults: {}
  };
}

test("IndexedDB storage creates, revises, lists, and deletes projects atomically", async () => {
  const databaseName = `augmentation-test-${crypto.randomUUID()}`;
  const storage = createAugmentationStorage({ indexedDB, databaseName, now: () => "2026-06-27T12:00:00.000Z" });
  try {
    const created = await storage.saveProject(makeProject("one"));
    assert.equal(created.revision, 1);
    assert.equal(created.createdAt, "2026-06-27T12:00:00.000Z");

    const updated = await storage.saveProject(
      { ...created, title: "Updated" },
      { expectedRevision: 1 }
    );
    assert.equal(updated.revision, 2);
    assert.equal((await storage.getProject("one")).title, "Updated");

    await storage.saveProject(makeProject("other", "book-b"));
    assert.deepEqual((await storage.listProjectsByBook("book-a")).map((item) => item.id), ["one"]);
    assert.equal(await storage.deleteProject("one"), true);
    assert.equal(await storage.getProject("one"), null);
  } finally {
    storage.close();
    await deleteAugmentationDatabase({ indexedDB, databaseName });
  }
});

test("stale tabs cannot overwrite a newer project revision", async () => {
  const databaseName = `augmentation-conflict-${crypto.randomUUID()}`;
  const storage = createAugmentationStorage({ indexedDB, databaseName });
  try {
    const created = await storage.saveProject(makeProject("one"));
    await storage.saveProject({ ...created, title: "Newer" }, { expectedRevision: 1 });
    await assert.rejects(
      storage.saveProject({ ...created, title: "Stale" }, { expectedRevision: 1 }),
      (error) => error instanceof AugmentationConflictError && error.actualRevision === 2
    );
    assert.equal((await storage.getProject("one")).title, "Newer");
  } finally {
    storage.close();
    await deleteAugmentationDatabase({ indexedDB, databaseName });
  }
});

test("book listings are newest-first and return clones", async () => {
  const databaseName = `augmentation-order-${crypto.randomUUID()}`;
  let tick = 0;
  const storage = createAugmentationStorage({
    indexedDB,
    databaseName,
    now: () => `2026-06-27T12:00:0${tick++}.000Z`
  });
  try {
    await storage.saveProject(makeProject("first"));
    await storage.saveProject(makeProject("second"));
    const projects = await storage.listProjectsByBook("book-a");
    assert.deepEqual(projects.map((item) => item.id), ["second", "first"]);
    projects[0].title = "Mutated outside";
    assert.equal((await storage.getProject("second")).title, "Project second");
  } finally {
    storage.close();
    await deleteAugmentationDatabase({ indexedDB, databaseName });
  }
});
