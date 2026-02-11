import { jest } from "@jest/globals";

const mockCreateVideo = jest.fn();
const mockUploadVideoChunk = jest.fn();
const mockFinishRecording = jest.fn();
const mockGetVideoDetail = jest.fn();

jest.unstable_mockModule("../../src/services/video.service.js", () => ({
  createVideo: mockCreateVideo,
  uploadVideoChunk: mockUploadVideoChunk,
  finishRecording: mockFinishRecording,
  getVideoDetail: mockGetVideoDetail,
}));

const {
  startRecording,
  uploadVideoChunk,
  finishRecording,
  handleGetVideoDetail,
} = await import("../../src/controllers/video.controller.js");

function createRes() {
  return {
    json: jest.fn().mockReturnThis(),
  };
}

describe("video.controller QA cases", () => {
  beforeEach(() => {
    mockCreateVideo.mockReset();
    mockUploadVideoChunk.mockReset();
    mockFinishRecording.mockReset();
    mockGetVideoDetail.mockReset();
  });

  test("startRecording forwards service error to next", async () => {
    const error = new Error("create failed");
    mockCreateVideo.mockRejectedValue(error);

    const req = { body: { title: "x" }, user: { id: 1n } };
    const res = createRes();
    const next = jest.fn();

    await startRecording(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });

  test("finishRecording forwards error when user is missing", async () => {
    const req = { params: { videoId: "1" }, body: { slideLogs: [] } };
    const res = createRes();
    const next = jest.fn();

    await finishRecording(req, res, next);

    expect(mockFinishRecording).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  test("handleGetVideoDetail returns json on success", async () => {
    const payload = { resultType: "SUCCESS", success: { videoId: "1" } };
    mockGetVideoDetail.mockResolvedValue(payload);

    const req = { params: { videoId: "1" } };
    const res = createRes();
    const next = jest.fn();

    await handleGetVideoDetail(req, res, next);

    expect(mockGetVideoDetail).toHaveBeenCalledWith({ videoId: "1" });
    expect(res.json).toHaveBeenCalledWith(payload);
    expect(next).not.toHaveBeenCalled();
  });

  test("uploadVideoChunk forwards service error", async () => {
    const error = new Error("chunk error");
    mockUploadVideoChunk.mockRejectedValue(error);

    const req = { params: { videoId: "1", chunkIndex: "0" }, file: { originalname: "c.webm" } };
    const res = createRes();
    const next = jest.fn();

    await uploadVideoChunk(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
