import {
  AUGMENTATION_DB_NAME,
  AUGMENTATION_DB_VERSION,
  AUGMENTATION_SCHEMA_VERSION
} from "./augmentationContracts.js";

const PROJECT_STORE = "projects";

function clone(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error ?? new Error("IndexedDB request failed.")), { once: true });
  });
}

function transactionComplete(transaction) {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener("abort", () => reject(transaction.error ?? new Error("IndexedDB transaction was aborted.")), { once: true });
    transaction.addEventListener("error", () => reject(transaction.error ?? new Error("IndexedDB transaction failed.")), { once: true });
  });
}

function validateProject(project) {
  if (!project || typeof project !== "object") {
    throw new TypeError("An augmentation project object is required.");
  }
  if (project.schemaVersion !== AUGMENTATION_SCHEMA_VERSION) {
    throw new Error(`Unsupported augmentation project schema: ${project.schemaVersion}.`);
  }
  for (const key of ["id", "homeBookSlug", "basePartKey", "title", "catalogRevision"]) {
    if (typeof project[key] !== "string" || project[key].trim() === "") {
      throw new Error(`Augmentation project '${key}' is required.`);
    }
  }
  if (!Array.isArray(project.orderedParts) || !Array.isArray(project.selectedGrades)) {
    throw new Error("Augmentation project ordering and selected grades must be arrays.");
  }
}

export class AugmentationConflictError extends Error {
  constructor(projectId, expectedRevision, actualRevision) {
    super(`Project '${projectId}' changed in another tab (expected revision ${expectedRevision}, actual ${actualRevision}).`);
    this.name = "AugmentationConflictError";
    this.projectId = projectId;
    this.expectedRevision = expectedRevision;
    this.actualRevision = actualRevision;
  }
}

function openDatabase(indexedDB, databaseName) {
  if (!indexedDB?.open) {
    return Promise.reject(new Error("IndexedDB is unavailable in this browser."));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, AUGMENTATION_DB_VERSION);
    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PROJECT_STORE)) {
        const store = database.createObjectStore(PROJECT_STORE, { keyPath: "id" });
        store.createIndex("homeBookSlug", "homeBookSlug", { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    });
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error ?? new Error("Could not open augmentation storage.")), { once: true });
    request.addEventListener("blocked", () => reject(new Error("Augmentation storage upgrade is blocked by another tab.")), { once: true });
  });
}

export function createAugmentationStorage({
  indexedDB = globalThis.indexedDB,
  databaseName = AUGMENTATION_DB_NAME,
  now = () => new Date().toISOString()
} = {}) {
  let databasePromise;
  const database = () => databasePromise ??= openDatabase(indexedDB, databaseName);

  return {
    async saveProject(project, { expectedRevision } = {}) {
      validateProject(project);
      const db = await database();
      const transaction = db.transaction(PROJECT_STORE, "readwrite");
      const store = transaction.objectStore(PROJECT_STORE);
      const existing = await requestResult(store.get(project.id));
      const actualRevision = existing?.revision ?? 0;
      if (expectedRevision !== undefined && expectedRevision !== actualRevision) {
        transaction.abort();
        try {
          await transactionComplete(transaction);
        } catch {
          // The explicit abort is represented by the domain conflict below.
        }
        throw new AugmentationConflictError(project.id, expectedRevision, actualRevision);
      }

      const timestamp = now();
      const saved = {
        ...clone(project),
        revision: actualRevision + 1,
        createdAt: existing?.createdAt ?? project.createdAt ?? timestamp,
        updatedAt: timestamp
      };
      store.put(saved);
      await transactionComplete(transaction);
      return clone(saved);
    },

    async getProject(projectId) {
      const db = await database();
      const transaction = db.transaction(PROJECT_STORE, "readonly");
      const value = await requestResult(transaction.objectStore(PROJECT_STORE).get(projectId));
      await transactionComplete(transaction);
      return value ? clone(value) : null;
    },

    async listProjects() {
      const db = await database();
      const transaction = db.transaction(PROJECT_STORE, "readonly");
      const values = await requestResult(transaction.objectStore(PROJECT_STORE).getAll());
      await transactionComplete(transaction);
      return values
        .map(clone)
        .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt), "en"));
    },

    async listProjectsByBook(homeBookSlug) {
      return (await this.listProjects()).filter((project) => project.homeBookSlug === homeBookSlug);
    },

    async deleteProject(projectId) {
      const db = await database();
      const transaction = db.transaction(PROJECT_STORE, "readwrite");
      const store = transaction.objectStore(PROJECT_STORE);
      const existing = await requestResult(store.get(projectId));
      if (existing) {
        store.delete(projectId);
      }
      await transactionComplete(transaction);
      return Boolean(existing);
    },

    close() {
      databasePromise?.then((db) => db.close()).catch(() => {});
    }
  };
}

export function deleteAugmentationDatabase({
  indexedDB = globalThis.indexedDB,
  databaseName = AUGMENTATION_DB_NAME
} = {}) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(databaseName);
    request.addEventListener("success", () => resolve(), { once: true });
    request.addEventListener("error", () => reject(request.error ?? new Error("Could not delete augmentation storage.")), { once: true });
    request.addEventListener("blocked", () => reject(new Error("Deleting augmentation storage is blocked.")), { once: true });
  });
}

export async function requestAugmentationPersistence(
  storageManager = globalThis.navigator?.storage
) {
  if (typeof storageManager?.persist !== "function") {
    return "unsupported";
  }
  try {
    return await storageManager.persist() ? "granted" : "denied";
  } catch {
    return "denied";
  }
}

export function createAugmentationNotifier({
  BroadcastChannel = globalThis.BroadcastChannel,
  channelName = "rissor-ag-augmentation"
} = {}) {
  const channel = typeof BroadcastChannel === "function"
    ? new BroadcastChannel(channelName)
    : null;
  return {
    channel,
    publish(message) {
      channel?.postMessage(clone(message));
    },
    subscribe(listener) {
      if (!channel || typeof listener !== "function") {
        return () => {};
      }
      const handleMessage = (event) => listener(clone(event.data));
      channel.addEventListener("message", handleMessage);
      return () => channel.removeEventListener("message", handleMessage);
    },
    close() {
      channel?.close();
    }
  };
}
