import assert from "node:assert/strict";
import test from "node:test";

import {
  AUGMENTATION_GRADE_SLUGS,
  orderAugmentationGradeSlugs
} from "./augmentationBrowser.js";

test("augmentation grade slugs are ordered by school progression, not alphabetically", () => {
  assert.deepEqual(AUGMENTATION_GRADE_SLUGS, [
    "2-sinif",
    "5-sinif",
    "8-sinif",
    "11-sinif",
    "lisans"
  ]);
  assert.deepEqual(
    orderAugmentationGradeSlugs(["11-sinif", "2-sinif", "5-sinif", "8-sinif", "lisans"]),
    ["2-sinif", "5-sinif", "8-sinif", "11-sinif", "lisans"]
  );
});
