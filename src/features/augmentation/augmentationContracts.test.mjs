import assert from "node:assert/strict";
import test from "node:test";
import {
  AUGMENTATION_CATALOG_VERSION,
  AUGMENTATION_DB_VERSION,
  AUGMENTATION_SCHEMA_VERSION,
  augmentedProjectPath,
  gradeSourceKey,
  partKey
} from "./augmentationContracts.js";

test("augmentation contracts expose stable versioned keys", () => {
  assert.equal(AUGMENTATION_SCHEMA_VERSION, 1);
  assert.equal(AUGMENTATION_CATALOG_VERSION, 1);
  assert.equal(AUGMENTATION_DB_VERSION, 1);
  assert.equal(partKey("book", "p08"), "book:p08");
  assert.equal(gradeSourceKey("book", "5-sinif", "p08"), "book:5-sinif:p08");
});

test("personal project paths use one static shell and an encoded local id", () => {
  assert.equal(
    augmentedProjectPath("kucuk-sozler", "local id", "tr"),
    "/books/kucuk-sozler/my-augmentations/view/?id=local%20id"
  );
  assert.equal(
    augmentedProjectPath("kucuk-sozler", "abc", "en"),
    "/en/books/kucuk-sozler/my-augmentations/view/?id=abc"
  );
});

