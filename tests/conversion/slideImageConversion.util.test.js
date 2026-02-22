import {
  getPdfRendererBinary,
  splitPageRanges,
  shouldUseNearLosslessJpeg,
} from "../../src/services/conversion/slideImageConversion.util.js";

describe("slideImageConversion.util", () => {
  test("getPdfRendererBinary uses pdftoppm by default", () => {
    if (process.platform === "win32") {
      const original = process.env.PDFTOPPM_PATH;
      process.env.PDFTOPPM_PATH = "C:\\\\tools\\\\pdftoppm.exe";
      expect(getPdfRendererBinary()).toBe("C:\\tools\\pdftoppm.exe");
      if (original === undefined) {
        delete process.env.PDFTOPPM_PATH;
      } else {
        process.env.PDFTOPPM_PATH = original;
      }
      return;
    }

    expect(getPdfRendererBinary()).toBe("pdftoppm");
  });

  test("splitPageRanges distributes pages across workers", () => {
    expect(splitPageRanges(10, 3)).toEqual([
      { start: 1, end: 4 },
      { start: 5, end: 7 },
      { start: 8, end: 10 },
    ]);
  });

  test("splitPageRanges handles single-page pdf", () => {
    expect(splitPageRanges(1, 8)).toEqual([{ start: 1, end: 1 }]);
  });

  test("splitPageRanges returns empty ranges for invalid page count", () => {
    expect(splitPageRanges(0, 4)).toEqual([]);
    expect(splitPageRanges(-1, 4)).toEqual([]);
  });

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
