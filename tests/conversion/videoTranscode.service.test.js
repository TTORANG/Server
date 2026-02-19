import { jest } from "@jest/globals";
import fs from "fs/promises";
import path from "path";

const mockGetVideoWithChunks = jest.fn();
const mockUpdateVideoStatus = jest.fn();
const mockUpdateVideoHlsUrl = jest.fn();
const mockDeleteVideoChunks = jest.fn();
const mockUpdateVideoMetadata = jest.fn();

const mockGetJobById = jest.fn();

const mockDownloadFromGCS = jest.fn();
const mockUploadToGCS = jest.fn();
const mockRunCmd = jest.fn();
const mockTmpPath = jest.fn();
const mockUuid = jest.fn();
const mockEnvPrefix = jest.fn();
const mockListFiles = jest.fn();

const mockProbeVideoMeta = jest.fn();
const mockExtractVideoThumbnail = jest.fn();

const mockPrisma = {
  videoSlideEvent: {
    findFirst: jest.fn(),
  },
  videoSlideDuration: {
    upsert: jest.fn(),
  },
};

jest.unstable_mockModule("../../src/repositories/video.repository.js", () => ({
  getVideoWithChunks: mockGetVideoWithChunks,
  updateVideoStatus: mockUpdateVideoStatus,
  updateVideoHlsUrl: mockUpdateVideoHlsUrl,
  deleteVideoChunks: mockDeleteVideoChunks,
  updateVideoMetadata: mockUpdateVideoMetadata,
}));

jest.unstable_mockModule("../../src/repositories/conversionJob.repository.js", () => ({
  getJobById: mockGetJobById,
}));

jest.unstable_mockModule("../../src/utils/conversion.util.js", () => ({
  downloadFromGCS: mockDownloadFromGCS,
  uploadToGCS: mockUploadToGCS,
  runCmd: mockRunCmd,
  tmpPath: mockTmpPath,
  uuid: mockUuid,
  envPrefix: mockEnvPrefix,
  listFiles: mockListFiles,
}));

jest.unstable_mockModule("../../src/utils/videoMeta.util.js", () => ({
  probeVideoMeta: mockProbeVideoMeta,
}));

jest.unstable_mockModule("../../src/utils/videoThumbnail.util.js", () => ({
  extractVideoThumbnail: mockExtractVideoThumbnail,
}));

jest.unstable_mockModule("../../src/utils/ffmpeg.util.js", () => ({
  FFMPEG_PATH: "ffmpeg",
}));

jest.unstable_mockModule("../../src/db.config.js", () => ({
  prisma: mockPrisma,
}));

const { videoTranscode } = await import("../../src/services/conversion/videoTranscode.service.js");

describe("videoTranscode.service", () => {
  const originalBucket = process.env.GCS_BUCKET_NAME;

  beforeEach(() => {
    process.env.GCS_BUCKET_NAME = "test-bucket";
    delete process.env.CDN_HOST;
    delete process.env.VIDEO_CHUNK_DOWNLOAD_CONCURRENCY;
    delete process.env.VIDEO_HLS_UPLOAD_CONCURRENCY;

    mockGetJobById.mockReset();
    mockGetVideoWithChunks.mockReset();
    mockUpdateVideoStatus.mockReset();
    mockUpdateVideoHlsUrl.mockReset();
    mockDeleteVideoChunks.mockReset();
    mockUpdateVideoMetadata.mockReset();

    mockDownloadFromGCS.mockReset();
    mockUploadToGCS.mockReset();
    mockRunCmd.mockReset();
    mockTmpPath.mockReset();
    mockUuid.mockReset();
    mockEnvPrefix.mockReset();
    mockListFiles.mockReset();

    mockProbeVideoMeta.mockReset();
    mockExtractVideoThumbnail.mockReset();

    mockPrisma.videoSlideEvent.findFirst.mockReset();
    mockPrisma.videoSlideDuration.upsert.mockReset();

    mockTmpPath.mockImplementation((filename) => `/tmp/${filename}`);
    mockUuid.mockReturnValue("video-hls-uuid");
    mockEnvPrefix.mockReturnValue("dev");
    mockDownloadFromGCS.mockImplementation(async ({ destPath }) => {
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.writeFile(destPath, "chunk-data");
      return destPath;
    });
    mockRunCmd.mockResolvedValue({ ok: true, stdout: "", stderr: "" });
    mockProbeVideoMeta.mockResolvedValue({
      durationSeconds: 32,
      width: 1280,
      height: 720,
      fps: 30,
      codec: "h264",
    });
    mockExtractVideoThumbnail.mockResolvedValue("gs://test-bucket/dev/video/10/thumbnail/thumb.png");
    mockPrisma.videoSlideEvent.findFirst.mockResolvedValue(null);
    mockListFiles.mockResolvedValue([
      "/tmp/video-work-1/hls/master.m3u8",
      "/tmp/video-work-1/hls/segment_000.ts",
      "/tmp/video-work-1/hls/segment_001.ts",
    ]);
    mockUploadToGCS.mockResolvedValue({ storageBucket: "test-bucket", storageKey: "k", url: "gs://x" });
  });

  afterEach(async () => {
    await fs.rm("/tmp/video-work-1", { recursive: true, force: true }).catch(() => {});
    await fs.rm("/tmp/video-work-2", { recursive: true, force: true }).catch(() => {});
  });

  afterAll(() => {
    if (originalBucket === undefined) {
      delete process.env.GCS_BUCKET_NAME;
    } else {
      process.env.GCS_BUCKET_NAME = originalBucket;
    }
  });

  test("uses concat+copy merge and performs single HLS encode stage", async () => {
    mockGetJobById.mockResolvedValue({ id: 1n, videoId: 10n });
    mockGetVideoWithChunks.mockResolvedValue({
      id: 10n,
      container: "mp4",
      chunks: [
        { chunkIndex: 0, storageBucket: "test-bucket", storageKey: "video/chunk-0.mp4" },
        { chunkIndex: 1, storageBucket: "test-bucket", storageKey: "video/chunk-1.mp4" },
      ],
    });

    const result = await videoTranscode("1");

    expect(mockDownloadFromGCS).toHaveBeenCalledTimes(2);
    expect(mockRunCmd).toHaveBeenCalledTimes(2);
    expect(mockRunCmd).toHaveBeenNthCalledWith(
      1,
      "ffmpeg",
      expect.arrayContaining(["-f", "concat", "-c", "copy"]),
      expect.objectContaining({
        logMeta: expect.objectContaining({ stage: "video_transcode.merge.concat_copy" }),
      })
    );
    expect(mockRunCmd).toHaveBeenNthCalledWith(
      2,
      "ffmpeg",
      expect.arrayContaining(["-f", "hls", "-crf", "23"]),
      expect.objectContaining({
        logMeta: expect.objectContaining({ stage: "video_transcode.encode_hls" }),
      })
    );

    const allArgs = mockRunCmd.mock.calls.flatMap((call) => call[1]);
    expect(allArgs).not.toContain("21");

    expect(mockUploadToGCS).toHaveBeenCalledTimes(3);
    expect(mockUpdateVideoMetadata).toHaveBeenCalledWith(10n, {
      durationSeconds: 32,
      width: 1280,
      height: 720,
      fps: 30,
      codec: "h264",
      thumbnailUrl: "gs://test-bucket/dev/video/10/thumbnail/thumb.png",
    });

    expect(mockDeleteVideoChunks).toHaveBeenCalledWith(10n);
    expect(mockUpdateVideoHlsUrl).toHaveBeenCalledWith(
      10n,
      "gs://test-bucket/dev/video/10/hls/video-hls-uuid/master.m3u8"
    );
    expect(result).toEqual({
      ok: true,
      hlsMasterUrl: "gs://test-bucket/dev/video/10/hls/video-hls-uuid/master.m3u8",
    });
  });

  test("falls back to raw append + remux(copy) when concat merge fails", async () => {
    mockGetJobById.mockResolvedValue({ id: 2n, videoId: 20n });
    mockGetVideoWithChunks.mockResolvedValue({
      id: 20n,
      container: "mp4",
      chunks: [
        { chunkIndex: 0, storageBucket: "test-bucket", storageKey: "video2/chunk-0.mp4" },
        { chunkIndex: 1, storageBucket: "test-bucket", storageKey: "video2/chunk-1.mp4" },
      ],
    });

    const concatError = new Error("concat failed");
    mockRunCmd
      .mockRejectedValueOnce(concatError)
      .mockResolvedValueOnce({ ok: true, stdout: "", stderr: "" })
      .mockResolvedValueOnce({ ok: true, stdout: "", stderr: "" });

    await videoTranscode("2");

    expect(mockRunCmd).toHaveBeenCalledTimes(3);
    expect(mockRunCmd).toHaveBeenNthCalledWith(
      1,
      "ffmpeg",
      expect.arrayContaining(["-f", "concat", "-c", "copy"]),
      expect.any(Object)
    );
    expect(mockRunCmd).toHaveBeenNthCalledWith(
      2,
      "ffmpeg",
      expect.arrayContaining(["-c", "copy", "-movflags", "+faststart"]),
      expect.objectContaining({
        logMeta: expect.objectContaining({ stage: "video_transcode.merge.remux_copy" }),
      })
    );
    expect(mockRunCmd).toHaveBeenNthCalledWith(
      3,
      "ffmpeg",
      expect.arrayContaining(["-f", "hls"]),
      expect.any(Object)
    );
  });
});
