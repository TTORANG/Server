import { shouldUseNearLosslessJpeg } from "../../src/services/conversion/slideImageConversion.util.js";

describe("slideImageConversion.util", () => {
  test("shouldUseNearLosslessJpeg returns true when saving ratio passes threshold", () => {
    const result = shouldUseNearLosslessJpeg({
      policy: "near_lossless",
      pngBytes: 4_000_000,
      jpegBytes: 2_000_000,
      minPngBytes: 2_000_000,
      minSavingRatio: 0.4,
    });

    expect(result).toBe(true);
  });

  test("shouldUseNearLosslessJpeg returns false when threshold is not met", () => {
    const smallFile = shouldUseNearLosslessJpeg({
      policy: "near_lossless",
      pngBytes: 1_000_000,
      jpegBytes: 300_000,
      minPngBytes: 2_000_000,
      minSavingRatio: 0.4,
    });

    const lowSaving = shouldUseNearLosslessJpeg({
      policy: "near_lossless",
      pngBytes: 4_000_000,
      jpegBytes: 3_000_000,
      minPngBytes: 2_000_000,
      minSavingRatio: 0.4,
    });

    expect(smallFile).toBe(false);
    expect(lowSaving).toBe(false);
  });
});
