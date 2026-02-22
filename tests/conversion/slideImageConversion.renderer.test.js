import { jest } from "@jest/globals";

const mockRunCmd = jest.fn();
const mockListFiles = jest.fn();
const mockParsePositiveInt = jest.fn((value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
});

jest.unstable_mockModule("../../src/utils/conversion.util.js", () => ({
  runCmd: mockRunCmd,
  listFiles: mockListFiles,
  parsePositiveInt: mockParsePositiveInt,
}));

const { renderPdfToPngPages } = await import(
  "../../src/services/conversion/slideImageConversion.util.js"
);

describe("slideImageConversion renderer", () => {
  const originalRenderWorkers = process.env.CONVERSION_RENDER_WORKERS;
  const originalPdftoppmPath = process.env.PDFTOPPM_PATH;
  const originalPdfinfoPath = process.env.PDFINFO_PATH;

  beforeEach(() => {
    delete process.env.CONVERSION_RENDER_WORKERS;
    mockRunCmd.mockReset();
    mockListFiles.mockReset();
    mockParsePositiveInt.mockClear();

    if (process.platform === "win32") {
      process.env.PDFTOPPM_PATH = "pdftoppm";
      process.env.PDFINFO_PATH = "pdfinfo";
    }
  });

  afterAll(() => {
    if (originalRenderWorkers === undefined) {
      delete process.env.CONVERSION_RENDER_WORKERS;
    } else {
      process.env.CONVERSION_RENDER_WORKERS = originalRenderWorkers;
    }

    if (originalPdftoppmPath === undefined) {
      delete process.env.PDFTOPPM_PATH;
    } else {
      process.env.PDFTOPPM_PATH = originalPdftoppmPath;
    }

    if (originalPdfinfoPath === undefined) {
      delete process.env.PDFINFO_PATH;
    } else {
      process.env.PDFINFO_PATH = originalPdfinfoPath;
    }
  });

  test("uses pdftoppm in single-page range render", async () => {
    mockRunCmd
      .mockResolvedValueOnce({ ok: true, stdout: "Pages: 1\n", stderr: "" })
      .mockResolvedValueOnce({ ok: true, stdout: "", stderr: "" });
    mockListFiles.mockResolvedValue(["/tmp/out/page-1.png"]);

    await renderPdfToPngPages({
      inputPdf: "/tmp/input.pdf",
      outDir: "/tmp/out",
      prefix: "/tmp/out/page",
      jobId: "1",
      jobType: "pdf_to_images",
      stageBase: "unit",
    });

    expect(mockRunCmd).toHaveBeenNthCalledWith(
      1,
      "pdfinfo",
      ["/tmp/input.pdf"],
      expect.objectContaining({
        logMeta: expect.objectContaining({ stage: "unit.pdfinfo" }),
      })
    );
    expect(mockRunCmd).toHaveBeenNthCalledWith(
      2,
      "pdftoppm",
      [
        "-png",
        "-r",
        "150",
        "-aa",
        "yes",
        "-aaVector",
        "yes",
        "-thinlinemode",
        "shape",
        "-f",
        "1",
        "-l",
        "1",
        "/tmp/input.pdf",
        "/tmp/out/page",
      ],
      expect.objectContaining({
        logMeta: expect.objectContaining({ stage: "unit.pages.1-1.pdftoppm" }),
      })
    );
  });

  test("uses pdftoppm for every worker range render", async () => {
    process.env.CONVERSION_RENDER_WORKERS = "3";

    mockRunCmd
      .mockResolvedValueOnce({ ok: true, stdout: "Pages: 5\n", stderr: "" })
      .mockResolvedValue({ ok: true, stdout: "", stderr: "" });
    mockListFiles.mockResolvedValue([
      "/tmp/out/page-1.png",
      "/tmp/out/page-2.png",
      "/tmp/out/page-3.png",
      "/tmp/out/page-4.png",
      "/tmp/out/page-5.png",
    ]);

    await renderPdfToPngPages({
      inputPdf: "/tmp/input.pdf",
      outDir: "/tmp/out",
      prefix: "/tmp/out/page",
      jobId: "2",
      jobType: "pdf_to_images",
      stageBase: "unit",
    });

    const renderCalls = mockRunCmd.mock.calls.slice(1);
    expect(renderCalls).toHaveLength(3);
    renderCalls.forEach(([cmd]) => {
      expect(cmd).toBe("pdftoppm");
    });

    const renderedRanges = renderCalls
      .map(([, args]) => {
        const start = args[args.indexOf("-f") + 1];
        const end = args[args.indexOf("-l") + 1];
        return `${start}-${end}`;
      })
      .sort();

    expect(renderedRanges).toEqual(["1-2", "3-4", "5-5"]);
  });

  test("uses pdftoppm single-pass render when pdfinfo fails", async () => {
    mockRunCmd
      .mockRejectedValueOnce(new Error("pdfinfo failed"))
      .mockResolvedValueOnce({ ok: true, stdout: "", stderr: "" });
    mockListFiles.mockResolvedValue(["/tmp/out/page-1.png"]);

    await renderPdfToPngPages({
      inputPdf: "/tmp/input.pdf",
      outDir: "/tmp/out",
      prefix: "/tmp/out/page",
      jobId: "3",
      jobType: "pdf_to_images",
      stageBase: "unit",
    });

    expect(mockRunCmd).toHaveBeenNthCalledWith(
      2,
      "pdftoppm",
      [
        "-png",
        "-r",
        "150",
        "-aa",
        "yes",
        "-aaVector",
        "yes",
        "-thinlinemode",
        "shape",
        "/tmp/input.pdf",
        "/tmp/out/page",
      ],
      expect.objectContaining({
        logMeta: expect.objectContaining({ stage: "unit.single_pass.pdftoppm" }),
      })
    );
  });
});
