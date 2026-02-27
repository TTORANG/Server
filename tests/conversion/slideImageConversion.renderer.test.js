import { jest } from "@jest/globals";

const setupRenderModule = async ({
  pageCount = 1,
  pageRenderErrorIndex = null,
  pdfiumInitError = null,
  loadDocumentError = null,
  sharpImportError = null,
} = {}) => {
  jest.resetModules();

  const mockReadFile = jest.fn().mockResolvedValue(Buffer.from("%PDF"));
  const mockWriteFile = jest.fn().mockResolvedValue(undefined);
  const mockMkdir = jest.fn().mockResolvedValue(undefined);
  const mockStat = jest.fn();
  const mockRm = jest.fn();

  jest.unstable_mockModule("fs/promises", () => ({
    default: {
      readFile: mockReadFile,
      writeFile: mockWriteFile,
      mkdir: mockMkdir,
      stat: mockStat,
      rm: mockRm,
    },
  }));

  const mockSharpToBuffer = jest.fn().mockResolvedValue(Buffer.from("encoded-png"));
  const mockSharpPng = jest.fn(() => ({ toBuffer: mockSharpToBuffer }));
  const mockSharp = jest.fn(() => ({
    png: mockSharpPng,
  }));

  if (sharpImportError) {
    jest.unstable_mockModule("sharp", () => {
      throw sharpImportError;
    });
  } else {
    jest.unstable_mockModule("sharp", () => ({
      default: mockSharp,
    }));
  }

  const pages = Array.from({ length: pageCount }, (_, pageIndex) => ({
    render: jest.fn(async (options) => {
      if (pageRenderErrorIndex === pageIndex) {
        throw new Error(`render failed: ${pageIndex + 1}`);
      }

      const encoded = await options.render({
        data: Uint8Array.from([1, 2, 3, 4]),
        width: 1,
        height: 1,
      });

      return { data: encoded };
    }),
  }));

  const mockDocumentDestroy = jest.fn();
  const mockDocument = {
    getPageCount: jest.fn(() => pageCount),
    getPage: jest.fn((pageIndex) => pages[pageIndex]),
    destroy: mockDocumentDestroy,
  };

  const mockLibraryDestroy = jest.fn();
  const mockLoadDocument = jest.fn();
  if (loadDocumentError) {
    mockLoadDocument.mockRejectedValue(loadDocumentError);
  } else {
    mockLoadDocument.mockResolvedValue(mockDocument);
  }

  const mockLibrary = {
    loadDocument: mockLoadDocument,
    destroy: mockLibraryDestroy,
  };

  const mockPdfiumInit = jest.fn();
  if (pdfiumInitError) {
    mockPdfiumInit.mockRejectedValue(pdfiumInitError);
  } else {
    mockPdfiumInit.mockResolvedValue(mockLibrary);
  }

  jest.unstable_mockModule("@hyzyla/pdfium", () => ({
    PDFiumLibrary: {
      init: mockPdfiumInit,
    },
  }));

  const mockParsePositiveInt = jest.fn((value, fallback) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  });

  jest.unstable_mockModule("../../src/utils/conversion.util.js", () => ({
    parsePositiveInt: mockParsePositiveInt,
  }));

  const { renderPdfToPngPages } = await import(
    "../../src/services/conversion/slideImageConversion.util.js"
  );

  return {
    renderPdfToPngPages,
    mocks: {
      mockReadFile,
      mockWriteFile,
      mockMkdir,
      mockSharp,
      mockSharpPng,
      mockSharpToBuffer,
      mockPdfiumInit,
      mockLoadDocument,
      mockLibraryDestroy,
      mockDocumentDestroy,
      pages,
    },
  };
};

describe("slideImageConversion renderer", () => {
  test("renders single-page pdf through pdfium + sharp", async () => {
    const { renderPdfToPngPages, mocks } = await setupRenderModule({ pageCount: 1 });

    const files = await renderPdfToPngPages({
      inputPdf: "/tmp/input.pdf",
      outDir: "/tmp/out",
      prefix: "/tmp/out/page",
      jobId: "1",
      jobType: "pdf_to_images",
      stageBase: "unit",
    });

    expect(files).toEqual(["/tmp/out/page-1.png"]);
    expect(mocks.mockMkdir).toHaveBeenCalledWith("/tmp/out", { recursive: true });
    expect(mocks.mockReadFile).toHaveBeenCalledWith("/tmp/input.pdf");
    expect(mocks.mockPdfiumInit).toHaveBeenCalledTimes(1);
    expect(mocks.mockLoadDocument).toHaveBeenCalledWith(Buffer.from("%PDF"));
    expect(mocks.pages[0].render).toHaveBeenCalledWith(
      expect.objectContaining({
        scale: 150 / 72,
        render: expect.any(Function),
      })
    );
    expect(mocks.mockSharp).toHaveBeenCalledWith(
      Buffer.from([1, 2, 3, 4]),
      expect.objectContaining({
        raw: {
          width: 1,
          height: 1,
          channels: 4,
        },
      })
    );
    expect(mocks.mockWriteFile).toHaveBeenCalledWith(
      "/tmp/out/page-1.png",
      Buffer.from("encoded-png")
    );
    expect(mocks.mockDocumentDestroy).toHaveBeenCalledTimes(1);
    expect(mocks.mockLibraryDestroy).toHaveBeenCalledTimes(1);
  });

  test("renders pages sequentially and preserves page order", async () => {
    const { renderPdfToPngPages, mocks } = await setupRenderModule({ pageCount: 3 });

    const files = await renderPdfToPngPages({
      inputPdf: "/tmp/input.pdf",
      outDir: "/tmp/out",
      prefix: "/tmp/out/page",
      dpi: 200,
    });

    expect(files).toEqual([
      "/tmp/out/page-1.png",
      "/tmp/out/page-2.png",
      "/tmp/out/page-3.png",
    ]);
    expect(mocks.pages[0].render).toHaveBeenCalledWith(
      expect.objectContaining({
        scale: 200 / 72,
      })
    );
    expect(mocks.pages[0].render.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.pages[1].render.mock.invocationCallOrder[0]
    );
    expect(mocks.pages[1].render.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.pages[2].render.mock.invocationCallOrder[0]
    );
    expect(mocks.mockWriteFile.mock.calls.map((call) => call[0])).toEqual([
      "/tmp/out/page-1.png",
      "/tmp/out/page-2.png",
      "/tmp/out/page-3.png",
    ]);
  });

  test("clamps render scale to at least 1", async () => {
    const { renderPdfToPngPages, mocks } = await setupRenderModule({ pageCount: 1 });

    await renderPdfToPngPages({
      inputPdf: "/tmp/input.pdf",
      outDir: "/tmp/out",
      prefix: "/tmp/out/page",
      dpi: 10,
    });

    expect(mocks.pages[0].render).toHaveBeenCalledWith(
      expect.objectContaining({
        scale: 1,
      })
    );
  });

  test("cleans up document/library when page render fails", async () => {
    const { renderPdfToPngPages, mocks } = await setupRenderModule({
      pageCount: 2,
      pageRenderErrorIndex: 1,
    });

    await expect(
      renderPdfToPngPages({
        inputPdf: "/tmp/input.pdf",
        outDir: "/tmp/out",
        prefix: "/tmp/out/page",
      })
    ).rejects.toThrow("render failed: 2");

    expect(mocks.mockDocumentDestroy).toHaveBeenCalledTimes(1);
    expect(mocks.mockLibraryDestroy).toHaveBeenCalledTimes(1);
  });

  test("propagates pdfium init failure", async () => {
    const { renderPdfToPngPages, mocks } = await setupRenderModule({
      pdfiumInitError: new Error("pdfium init failed"),
    });

    await expect(
      renderPdfToPngPages({
        inputPdf: "/tmp/input.pdf",
        outDir: "/tmp/out",
        prefix: "/tmp/out/page",
      })
    ).rejects.toThrow("pdfium init failed");

    expect(mocks.mockPdfiumInit).toHaveBeenCalledTimes(1);
    expect(mocks.mockLibraryDestroy).not.toHaveBeenCalled();
  });

  test("fails fast when sharp module cannot be loaded", async () => {
    const { renderPdfToPngPages, mocks } = await setupRenderModule({
      sharpImportError: new Error("sharp unavailable"),
    });

    await expect(
      renderPdfToPngPages({
        inputPdf: "/tmp/input.pdf",
        outDir: "/tmp/out",
        prefix: "/tmp/out/page",
      })
    ).rejects.toThrow("SHARP_LOAD_FAILED: sharp unavailable");

    expect(mocks.mockDocumentDestroy).toHaveBeenCalledTimes(1);
    expect(mocks.mockLibraryDestroy).toHaveBeenCalledTimes(1);
  });
});
