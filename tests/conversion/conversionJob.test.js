import { jest } from "@jest/globals";

const mockCreateConversionJob = jest.fn();
const mockUpdateJobToProcessing = jest.fn();
const mockUpdateJobToCompleted = jest.fn();
const mockUpdateJobToFailed = jest.fn();
const mockGetJobById = jest.fn();
const mockEnqueueConversionTask = jest.fn();
const mockPptxToImages = jest.fn();
const mockPdfToImages = jest.fn();
const mockGenerateThumbnail = jest.fn();
const mockExtractMetadata = jest.fn();
const mockVideoTranscode = jest.fn();

jest.unstable_mockModule("../../src/repositories/conversionJob.repository.js", () => ({
  createConversionJob: mockCreateConversionJob,
  updateJobToProcessing: mockUpdateJobToProcessing,
  updateJobToCompleted: mockUpdateJobToCompleted,
  updateJobToFailed: mockUpdateJobToFailed,
  getJobById: mockGetJobById,
}));

jest.unstable_mockModule("../../src/queues/conversionJob.queue.js", () => ({
  enqueueConversionTask: mockEnqueueConversionTask,
}));

jest.unstable_mockModule("../../src/services/conversion/pptxToImages.service.js", () => ({
  pptxToImages: mockPptxToImages,
}));

jest.unstable_mockModule("../../src/services/conversion/pdfToImages.service.js", () => ({
  pdfToImages: mockPdfToImages,
}));

jest.unstable_mockModule("../../src/services/conversion/thumbnail.service.js", () => ({
  generateThumbnail: mockGenerateThumbnail,
}));

jest.unstable_mockModule("../../src/services/conversion/metadata.service.js", () => ({
  extractMetadata: mockExtractMetadata,
}));

jest.unstable_mockModule("../../src/services/conversion/videoTranscode.service.js", () => ({
  videoTranscode: mockVideoTranscode,
}));

const { processJob, startConversionPipeline } =
  await import("../../src/services/conversionJob.service.js");

describe("conversion pipeline tests", () => {
  const originalProjectId = process.env.GCP_PROJECT_ID;
  const originalCloudRunServiceUrl = process.env.CLOUD_RUN_SERVICE_URL;
  let errorSpy;
  let warnSpy;
  let logSpy;

  beforeAll(() => {
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  beforeEach(() => {
    process.env.GCP_PROJECT_ID = "test-project";
    process.env.CLOUD_RUN_SERVICE_URL = "https://example.run.app";

    mockCreateConversionJob.mockReset();
    mockUpdateJobToProcessing.mockReset();
    mockUpdateJobToCompleted.mockReset();
    mockUpdateJobToFailed.mockReset();
    mockGetJobById.mockReset();
    mockEnqueueConversionTask.mockReset();
    mockPptxToImages.mockReset();
    mockPdfToImages.mockReset();
    mockGenerateThumbnail.mockReset();
    mockExtractMetadata.mockReset();
    mockVideoTranscode.mockReset();
  });

  afterAll(() => {
    if (originalProjectId === undefined) {
      delete process.env.GCP_PROJECT_ID;
    } else {
      process.env.GCP_PROJECT_ID = originalProjectId;
    }

    if (originalCloudRunServiceUrl === undefined) {
      delete process.env.CLOUD_RUN_SERVICE_URL;
    } else {
      process.env.CLOUD_RUN_SERVICE_URL = originalCloudRunServiceUrl;
    }

    errorSpy.mockRestore();
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  test("startConversionPipeline creates pptx_to_images job for pptx", async () => {
    mockCreateConversionJob.mockResolvedValue({ id: 11n });
    mockEnqueueConversionTask.mockResolvedValue(undefined);

    const result = await startConversionPipeline({
      uploadedFileId: 100n,
      fileExt: "pptx",
      projectId: 200n,
    });

    expect(mockCreateConversionJob).toHaveBeenCalledWith({
      uploadedFileId: 100n,
      videoId: undefined,
      jobType: "pptx_to_images",
      projectId: 200n,
    });
    expect(mockEnqueueConversionTask).toHaveBeenCalledWith({
      conversionJobId: "11",
      jobType: "pptx_to_images",
    });
    expect(result).toEqual({
      jobs: [{ id: "11", jobType: "pptx_to_images" }],
    });
  });

  test("startConversionPipeline creates pdf_to_images job for pdf", async () => {
    mockCreateConversionJob.mockResolvedValue({ id: 12n });
    mockEnqueueConversionTask.mockResolvedValue(undefined);

    const result = await startConversionPipeline({
      uploadedFileId: 101n,
      fileExt: "pdf",
      projectId: 201n,
    });

    expect(mockCreateConversionJob).toHaveBeenCalledWith({
      uploadedFileId: 101n,
      videoId: undefined,
      jobType: "pdf_to_images",
      projectId: 201n,
    });
    expect(mockEnqueueConversionTask).toHaveBeenCalledWith({
      conversionJobId: "12",
      jobType: "pdf_to_images",
    });
    expect(result).toEqual({
      jobs: [{ id: "12", jobType: "pdf_to_images" }],
    });
  });

  test("startConversionPipeline skips unsupported file extension", async () => {
    const result = await startConversionPipeline({
      uploadedFileId: 102n,
      fileExt: "txt",
      projectId: 202n,
    });

    expect(mockCreateConversionJob).not.toHaveBeenCalled();
    expect(mockEnqueueConversionTask).not.toHaveBeenCalled();
    expect(result).toEqual({ jobs: [] });
  });

  test("processJob returns success immediately when already completed", async () => {
    mockGetJobById.mockResolvedValue({ status: "completed" });

    const result = await processJob("100", "pdf_to_images");

    expect(mockUpdateJobToProcessing).not.toHaveBeenCalled();
    expect(mockUpdateJobToCompleted).not.toHaveBeenCalled();
    expect(mockUpdateJobToFailed).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  test("processJob marks failed when execute throws", async () => {
    mockGetJobById.mockResolvedValue({ status: "queued" });
    mockUpdateJobToProcessing.mockResolvedValue(undefined);
    mockPptxToImages.mockRejectedValue(new Error("boom"));
    mockUpdateJobToFailed.mockResolvedValue(undefined);

    const result = await processJob("99", "pptx_to_images");

    expect(mockUpdateJobToProcessing).toHaveBeenCalledWith("99");
    expect(mockPptxToImages).toHaveBeenCalledWith("99");
    expect(mockUpdateJobToCompleted).not.toHaveBeenCalled();
    expect(mockUpdateJobToFailed).toHaveBeenCalledWith("99", "boom");
    expect(result).toEqual({ success: false, error: "boom" });
  });

  test("processJob marks failed for unknown job type", async () => {
    mockGetJobById.mockResolvedValue({ status: "queued" });
    mockUpdateJobToProcessing.mockResolvedValue(undefined);
    mockUpdateJobToFailed.mockResolvedValue(undefined);

    const result = await processJob("77", "unknown_type");

    expect(mockUpdateJobToProcessing).toHaveBeenCalledWith("77");
    expect(mockUpdateJobToCompleted).not.toHaveBeenCalled();
    expect(mockUpdateJobToFailed).toHaveBeenCalledWith(
      "77",
      "Unknown job type: unknown_type"
    );
    expect(result).toEqual({
      success: false,
      error: "Unknown job type: unknown_type",
    });
  });
});
