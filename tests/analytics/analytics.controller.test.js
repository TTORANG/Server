import { jest } from "@jest/globals";

// ==================== Mock 정의 ====================

const mockRecordPageView = jest.fn();
const mockRecordSlideView = jest.fn();
const mockRecordVideoEvent = jest.fn();
const mockRecordExit = jest.fn();
const mockGetSummary = jest.fn();
const mockGetSlideAnalytics = jest.fn();
const mockGetVideoTimeline = jest.fn();
const mockGetVideoExits = jest.fn();
const mockGetRecentComments = jest.fn();
const mockGetSlideRetention = jest.fn();
const mockGetVideoRetention = jest.fn();

jest.unstable_mockModule("../../src/services/analytics.service.js", () => ({
  recordPageView: mockRecordPageView,
  recordSlideView: mockRecordSlideView,
  recordVideoEvent: mockRecordVideoEvent,
  recordExit: mockRecordExit,
  getSummary: mockGetSummary,
  getSlideAnalytics: mockGetSlideAnalytics,
  getVideoTimeline: mockGetVideoTimeline,
  getVideoExits: mockGetVideoExits,
  getRecentComments: mockGetRecentComments,
  getSlideRetention: mockGetSlideRetention,
  getVideoRetention: mockGetVideoRetention,
}));

const {
  handleRecordPageView,
  handleRecordSlideView,
  handleRecordVideoEvent,
  handleRecordExit,
  handleGetSummary,
  handleGetSlideAnalytics,
  handleGetVideoTimeline,
  handleGetVideoExits,
  handleGetRecentComments,
  handleGetSlideRetention,
  handleGetVideoRetention,
} = await import("../../src/controllers/analytics.controller.js");

// ==================== 헬퍼 ====================

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

const successPayload = { resultType: "SUCCESS", error: null, success: { ok: true } };

// ==================== POST 수집 API ====================

describe("analytics.controller POST (수집)", () => {
  beforeEach(() => {
    mockRecordPageView.mockReset();
    mockRecordSlideView.mockReset();
    mockRecordVideoEvent.mockReset();
    mockRecordExit.mockReset();
  });

  // --- handleRecordPageView ---

  test("handleRecordPageView 성공 시 res.json 호출", async () => {
    mockRecordPageView.mockResolvedValue(successPayload);
    const req = { body: { shareToken: "abc123" }, user: { sessionId: "sess-1" } };
    const res = createRes();
    const next = jest.fn();

    await handleRecordPageView(req, res, next);

    expect(mockRecordPageView).toHaveBeenCalledWith({
      shareToken: "abc123",
      sessionId: "sess-1",
    });
    expect(res.json).toHaveBeenCalledWith(successPayload);
    expect(next).not.toHaveBeenCalled();
  });

  test("handleRecordPageView 서비스 에러 시 next 전파", async () => {
    const error = new Error("service error");
    mockRecordPageView.mockRejectedValue(error);
    const req = { body: { shareToken: "abc" }, user: { sessionId: "s1" } };
    const res = createRes();
    const next = jest.fn();

    await handleRecordPageView(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  // --- handleRecordSlideView ---

  test("handleRecordSlideView 성공 시 res.json 호출", async () => {
    mockRecordSlideView.mockResolvedValue(successPayload);
    const req = { body: { slideId: 1 }, user: { sessionId: "sess-1" } };
    const res = createRes();
    const next = jest.fn();

    await handleRecordSlideView(req, res, next);

    expect(mockRecordSlideView).toHaveBeenCalledWith({
      slideId: 1,
      sessionId: "sess-1",
    });
    expect(res.json).toHaveBeenCalledWith(successPayload);
  });

  test("handleRecordSlideView 서비스 에러 시 next 전파", async () => {
    const error = new Error("slide not found");
    mockRecordSlideView.mockRejectedValue(error);
    const req = { body: { slideId: 999 }, user: { sessionId: "s1" } };
    const res = createRes();
    const next = jest.fn();

    await handleRecordSlideView(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  // --- handleRecordVideoEvent ---

  test("handleRecordVideoEvent 성공 시 res.json 호출", async () => {
    mockRecordVideoEvent.mockResolvedValue(successPayload);
    const req = {
      body: { videoId: 10, eventType: "play", timestampMs: 5000 },
      user: { sessionId: "sess-1" },
    };
    const res = createRes();
    const next = jest.fn();

    await handleRecordVideoEvent(req, res, next);

    expect(mockRecordVideoEvent).toHaveBeenCalledWith({
      videoId: 10,
      eventType: "play",
      timestampMs: 5000,
      sessionId: "sess-1",
    });
    expect(res.json).toHaveBeenCalledWith(successPayload);
  });

  test("handleRecordVideoEvent 서비스 에러 시 next 전파", async () => {
    const error = new Error("invalid event");
    mockRecordVideoEvent.mockRejectedValue(error);
    const req = {
      body: { videoId: 10, eventType: "invalid", timestampMs: 0 },
      user: { sessionId: "s1" },
    };
    const res = createRes();
    const next = jest.fn();

    await handleRecordVideoEvent(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  // --- handleRecordExit ---

  test("handleRecordExit 성공 시 res.json 호출", async () => {
    mockRecordExit.mockResolvedValue(successPayload);
    const req = {
      body: { shareToken: "abc", lastSlideId: 1, lastVideoId: 10, lastVideoTimeMs: 5000 },
      user: { sessionId: "sess-1" },
    };
    const res = createRes();
    const next = jest.fn();

    await handleRecordExit(req, res, next);

    expect(mockRecordExit).toHaveBeenCalledWith({
      shareToken: "abc",
      sessionId: "sess-1",
      lastSlideId: 1,
      lastVideoId: 10,
      lastVideoTimeMs: 5000,
    });
    expect(res.json).toHaveBeenCalledWith(successPayload);
  });

  test("handleRecordExit 서비스 에러 시 next 전파", async () => {
    const error = new Error("exit error");
    mockRecordExit.mockRejectedValue(error);
    const req = {
      body: { shareToken: "abc" },
      user: { sessionId: "s1" },
    };
    const res = createRes();
    const next = jest.fn();

    await handleRecordExit(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

// ==================== GET 조회 API ====================

describe("analytics.controller GET (조회)", () => {
  beforeEach(() => {
    mockGetSummary.mockReset();
    mockGetSlideAnalytics.mockReset();
    mockGetVideoTimeline.mockReset();
    mockGetVideoExits.mockReset();
    mockGetRecentComments.mockReset();
    mockGetSlideRetention.mockReset();
    mockGetVideoRetention.mockReset();
  });

  // --- handleGetSummary ---

  test("handleGetSummary 성공 시 res.json 호출", async () => {
    const payload = { resultType: "SUCCESS", error: null, success: { totalViews: 10 } };
    mockGetSummary.mockResolvedValue(payload);
    const req = { params: { projectId: "1" } };
    const res = createRes();
    const next = jest.fn();

    await handleGetSummary(req, res, next);

    expect(mockGetSummary).toHaveBeenCalledWith({ projectId: "1" });
    expect(res.json).toHaveBeenCalledWith(payload);
  });

  test("handleGetSummary 서비스 에러 시 next 전파", async () => {
    const error = new Error("project not found");
    mockGetSummary.mockRejectedValue(error);
    const req = { params: { projectId: "999" } };
    const res = createRes();
    const next = jest.fn();

    await handleGetSummary(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  // --- handleGetSlideAnalytics ---

  test("handleGetSlideAnalytics 서비스 에러 시 next 전파", async () => {
    const error = new Error("fail");
    mockGetSlideAnalytics.mockRejectedValue(error);
    const req = { params: { projectId: "1" } };
    const res = createRes();
    const next = jest.fn();

    await handleGetSlideAnalytics(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  // --- handleGetVideoTimeline ---

  test("handleGetVideoTimeline 서비스 에러 시 next 전파", async () => {
    const error = new Error("video not found");
    mockGetVideoTimeline.mockRejectedValue(error);
    const req = { params: { videoId: "1" } };
    const res = createRes();
    const next = jest.fn();

    await handleGetVideoTimeline(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  // --- handleGetVideoExits ---

  test("handleGetVideoExits 서비스 에러 시 next 전파", async () => {
    const error = new Error("fail");
    mockGetVideoExits.mockRejectedValue(error);
    const req = { params: { videoId: "1" } };
    const res = createRes();
    const next = jest.fn();

    await handleGetVideoExits(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  // --- handleGetRecentComments ---

  test("handleGetRecentComments 성공 시 limit 전달", async () => {
    const payload = { resultType: "SUCCESS", error: null, success: { comments: [] } };
    mockGetRecentComments.mockResolvedValue(payload);
    const req = { params: { projectId: "1" }, query: { limit: "5" } };
    const res = createRes();
    const next = jest.fn();

    await handleGetRecentComments(req, res, next);

    expect(mockGetRecentComments).toHaveBeenCalledWith({
      projectId: "1",
      limit: "5",
    });
    expect(res.json).toHaveBeenCalledWith(payload);
  });

  // --- handleGetSlideRetention ---

  test("handleGetSlideRetention 성공 시 res.json 호출", async () => {
    const payload = { resultType: "SUCCESS", error: null, success: { slideRetention: [] } };
    mockGetSlideRetention.mockResolvedValue(payload);
    const req = { params: { projectId: "1" } };
    const res = createRes();
    const next = jest.fn();

    await handleGetSlideRetention(req, res, next);

    expect(mockGetSlideRetention).toHaveBeenCalledWith({ projectId: "1" });
    expect(res.json).toHaveBeenCalledWith(payload);
  });

  test("handleGetSlideRetention 서비스 에러 시 next 전파", async () => {
    const error = new Error("fail");
    mockGetSlideRetention.mockRejectedValue(error);
    const req = { params: { projectId: "1" } };
    const res = createRes();
    const next = jest.fn();

    await handleGetSlideRetention(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  // --- handleGetVideoRetention ---

  test("handleGetVideoRetention 성공 시 res.json 호출", async () => {
    const payload = { resultType: "SUCCESS", error: null, success: { videoRetention: [] } };
    mockGetVideoRetention.mockResolvedValue(payload);
    const req = { params: { videoId: "1" } };
    const res = createRes();
    const next = jest.fn();

    await handleGetVideoRetention(req, res, next);

    expect(mockGetVideoRetention).toHaveBeenCalledWith({ videoId: "1" });
    expect(res.json).toHaveBeenCalledWith(payload);
  });

  test("handleGetVideoRetention 서비스 에러 시 next 전파", async () => {
    const error = new Error("fail");
    mockGetVideoRetention.mockRejectedValue(error);
    const req = { params: { videoId: "1" } };
    const res = createRes();
    const next = jest.fn();

    await handleGetVideoRetention(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
