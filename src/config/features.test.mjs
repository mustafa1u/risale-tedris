import assert from "node:assert/strict";
import test from "node:test";

import { isAugmentationEnabled, isSearchEnabled } from "./features.js";

test("augmentation is always available in development but remains deployment-gated in production", () => {
  assert.equal(isAugmentationEnabled({ development: true, publicFlag: "false" }), true);
  assert.equal(isAugmentationEnabled({ development: false }), false);
  assert.equal(isAugmentationEnabled({ development: false, publicFlag: "true" }), true);
  assert.equal(isAugmentationEnabled({ development: false, publicFlag: "TRUE" }), false);
});

test("full-text search is available in development but remains reversibly deployment-gated", () => {
  assert.equal(isSearchEnabled({ development: true, publicFlag: "false" }), true);
  assert.equal(isSearchEnabled({ development: false }), false);
  assert.equal(isSearchEnabled({ development: false, publicFlag: "true" }), true);
  assert.equal(isSearchEnabled({ development: false, publicFlag: "TRUE" }), false);
});
