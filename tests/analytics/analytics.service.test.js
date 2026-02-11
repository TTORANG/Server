import { jest } from "@jest/globals";

// ==================== Mock 정의 ====================

jest.unstable_mockModule("../../src/repositories/analytics.repository.js", () => ({
  findProjectById: jest.fn(),
  findVideoById: jest.fn(),
  findSlideById: jest.fn(),
  findSlidesByProjectId: jest.fn(),
  findLastSlideByProjectId: jest.fn(),
  findVideosByProjectId: jest.fn(),
  createPageView: jest.fn(),
  createSlideView: jest.fn(),
  createVideoEvent: jest.fn(),
  createExit: jest.fn(),
  groupPageViewsBySession: jest.fn(),
  getAvgDuration: jest.fn(),
  groupSlideViewsBySlideAndSession: jest.fn(),
  groupSlideViewsBySlideIdAndSession: jest.fn(),
  getExitMaxTimePerSession: jest.fn(),
  groupVideoEventsBySession: jest.fn(),
  countReactionsByTarget: jest.fn(),
  countCommentsByTarget: jest.fn(),
  groupReactionsByTargetId: jest.fn(),
  groupCommentsByTargetId: jest.fn(),
  getSlideViewSessionPairs: jest.fn(),
  getMaxTimestampPerSession: jest.fn(),
  findVideoReactionsWithTimestamp: jest.fn(),
  findVideoCommentsWithTimestamp: jest.fn(),
}));

jest.unstable_mockModule("../../src/repositories/shareLink.repository.js", () => ({
  findProjectIdByShareToken: jest.fn(),
}));

jest.unstable_mockModule("../../src/repositories/comment.repository.js", () => ({
  findRecentVideoCommentsByProjectId: jest.fn().mockResolvedValue([]),
}));

jest.unstable_mockModule("../../src/repositories/video.repository.js", () => ({
  findSlideByTimestamp: jest.fn(),
}));

jest.unstable_mockModule("../../src/utils/storageUrl.util.js", () => ({
  toPublicStorageUrl: jest.fn((url) => url),
}));

const repo = await import("../../src/repositories/analytics.repository.js");
const shareRepo = await import("../../src/repositories/shareLink.repository.js");

const {
  recordPageView,
  recordSlideView,
  recordVideoEvent,
  recordExit,
  getSummary,
  getSlideAnalytics,
  getSlideRetention,
  getVideoExits,
  getVideoRetention,
} = await import("../../src/services/analytics.service.js");

// ==================== POST 수집 API ====================

describe("recordPageView", () => {
  test("정상 기록 성공", async () => {
    shareRepo.findProjectIdByShareToken.mockResolvedValue({
      projectId: 1n,
      isActive: true,
      expiredAt: null,
    });
    repo.createPageView.mockResolvedValue({});

    const result = await recordPageView({ shareToken: "token1", sessionId: "sess-1" });

    expect(result.resultType).toBe("SUCCESS");
    expect(repo.createPageView).toHaveBeenCalledWith({ projectId: 1, sessionId: "sess-1" });
  });

  test("sessionId 없으면 에러", async () => {
    await expect(
      recordPageView({ shareToken: "token1", sessionId: null })
    ).rejects.toThrow();
  });

  test("유효하지 않은 shareToken이면 에러", async () => {
    shareRepo.findProjectIdByShareToken.mockResolvedValue(null);

    await expect(
      recordPageView({ shareToken: "invalid", sessionId: "sess-1" })
    ).rejects.toThrow();
  });
});

describe("recordSlideView", () => {
  test("정상 기록 성공", async () => {
    repo.findSlideById.mockResolvedValue({ id: 1n, projectId: 10n });
    repo.createSlideView.mockResolvedValue({});

    const result = await recordSlideView({ slideId: 1, sessionId: "sess-1" });

    expect(result.resultType).toBe("SUCCESS");
    expect(repo.createSlideView).toHaveBeenCalledWith({
      projectId: 10n,
      slideId: 1,
      sessionId: "sess-1",
    });
  });

  test("sessionId 없으면 에러", async () => {
    await expect(recordSlideView({ slideId: 1, sessionId: null })).rejects.toThrow();
  });

  test("잘못된 slideId면 에러", async () => {
    await expect(recordSlideView({ slideId: "abc", sessionId: "sess-1" })).rejects.toThrow();
  });

  test("존재하지 않는 슬라이드면 에러", async () => {
    repo.findSlideById.mockResolvedValue(null);

    await expect(recordSlideView({ slideId: 999, sessionId: "sess-1" })).rejects.toThrow();
  });
});

describe("recordVideoEvent", () => {
  test("play 이벤트 정상 기록", async () => {
    repo.findVideoById.mockResolvedValue({ id: 10n, durationSeconds: 60, projectId: 1n });
    repo.createVideoEvent.mockResolvedValue({});

    const result = await recordVideoEvent({
      videoId: 10, eventType: "play", timestampMs: 5000, sessionId: "sess-1",
    });

    expect(result.resultType).toBe("SUCCESS");
    expect(repo.createVideoEvent).toHaveBeenCalledWith({
      videoId: 10, sessionId: "sess-1", eventType: "play", timestampMs: 5000,
    });
  });

  test("잘못된 eventType이면 에러", async () => {
    await expect(
      recordVideoEvent({ videoId: 10, eventType: "invalid", timestampMs: 0, sessionId: "s1" })
    ).rejects.toThrow();
  });

  test("음수 timestampMs면 에러", async () => {
    await expect(
      recordVideoEvent({ videoId: 10, eventType: "play", timestampMs: -1, sessionId: "s1" })
    ).rejects.toThrow();
  });

  test("sessionId 없으면 에러", async () => {
    await expect(
      recordVideoEvent({ videoId: 10, eventType: "play", timestampMs: 0, sessionId: null })
    ).rejects.toThrow();
  });
});

describe("recordExit", () => {
  test("정상 기록 성공", async () => {
    shareRepo.findProjectIdByShareToken.mockResolvedValue({
      projectId: 1n, isActive: true, expiredAt: null,
    });
    repo.findSlideById.mockResolvedValue({ id: 1n, projectId: 1n });
    repo.findVideoById.mockResolvedValue({ id: 10n, durationSeconds: 60, projectId: 1n });
    repo.createExit.mockResolvedValue({});

    const result = await recordExit({
      shareToken: "token1", sessionId: "sess-1",
      lastSlideId: 1, lastVideoId: 10, lastVideoTimeMs: 5000,
    });

    expect(result.resultType).toBe("SUCCESS");
    expect(repo.createExit).toHaveBeenCalledWith({
      projectId: 1, sessionId: "sess-1",
      lastSlideId: 1, lastVideoId: 10, lastVideoTimeMs: 5000,
    });
  });

  test("sessionId 없으면 에러", async () => {
    await expect(recordExit({ shareToken: "token1", sessionId: null })).rejects.toThrow();
  });

  test("존재하지 않는 슬라이드면 에러", async () => {
    shareRepo.findProjectIdByShareToken.mockResolvedValue({
      projectId: 1n, isActive: true, expiredAt: null,
    });
    repo.findSlideById.mockResolvedValue(null);

    await expect(
      recordExit({ shareToken: "token1", sessionId: "s1", lastSlideId: 999 })
    ).rejects.toThrow();
  });
});

// ==================== GET 조회 API ====================

describe("getSlideAnalytics (이탈률)", () => {
  test("세션별 마지막 본 슬라이드가 이탈 지점, 이탈률 합계 100%", async () => {
    repo.findProjectById.mockResolvedValue({ id: 1n });
    repo.findSlidesByProjectId.mockResolvedValue([
      { id: 1n, title: "슬라이드1", slideNum: 1n },
      { id: 2n, title: "슬라이드2", slideNum: 2n },
      { id: 3n, title: "슬라이드3", slideNum: 3n },
    ]);

    // 세션 A: 슬1(10시), 슬2(11시), 슬3(12시) → 마지막=슬3
    // 세션 B: 슬1(10시), 슬2(11시) → 마지막=슬2
    repo.groupSlideViewsBySlideAndSession.mockResolvedValue([
      { slideId: 1n, sessionId: "A", _max: { createdAt: new Date("2026-01-01T10:00:00Z") } },
      { slideId: 2n, sessionId: "A", _max: { createdAt: new Date("2026-01-01T11:00:00Z") } },
      { slideId: 3n, sessionId: "A", _max: { createdAt: new Date("2026-01-01T12:00:00Z") } },
      { slideId: 1n, sessionId: "B", _max: { createdAt: new Date("2026-01-01T10:00:00Z") } },
      { slideId: 2n, sessionId: "B", _max: { createdAt: new Date("2026-01-01T11:00:00Z") } },
    ]);
    repo.groupReactionsByTargetId.mockResolvedValue([]);
    repo.groupCommentsByTargetId.mockResolvedValue([]);

    const result = await getSlideAnalytics({ projectId: "1" });
    const slides = result.success.slides;

    expect(slides[0].exitCount).toBe(0); // 슬1: 이탈 없음
    expect(slides[1].exitCount).toBe(1); // 슬2: 세션 B 이탈
    expect(slides[2].exitCount).toBe(1); // 슬3: 세션 A 이탈

    const totalExitRate = slides.reduce((sum, s) => sum + s.exitRate, 0);
    expect(totalExitRate).toBe(100);
  });

  test("슬라이드가 없으면 빈 결과", async () => {
    repo.findProjectById.mockResolvedValue({ id: 1n });
    repo.findSlidesByProjectId.mockResolvedValue([]);
    repo.groupSlideViewsBySlideAndSession.mockResolvedValue([]);
    repo.groupReactionsByTargetId.mockResolvedValue([]);
    repo.groupCommentsByTargetId.mockResolvedValue([]);

    const result = await getSlideAnalytics({ projectId: "1" });
    expect(result.success.slides).toEqual([]);
  });
});

describe("getSlideRetention (슬라이드 잔존률)", () => {
  test("첫 슬라이드 100%, 단조 감소", async () => {
    repo.findProjectById.mockResolvedValue({ id: 1n });
    repo.findSlidesByProjectId.mockResolvedValue([
      { id: 1n, title: "슬1", slideNum: 1n },
      { id: 2n, title: "슬2", slideNum: 2n },
      { id: 3n, title: "슬3", slideNum: 3n },
    ]);

    // 3세션: A→슬3까지, B→슬2까지, C→슬1까지
    repo.getSlideViewSessionPairs.mockResolvedValue([
      { slideId: 1n, sessionId: "A" },
      { slideId: 2n, sessionId: "A" },
      { slideId: 3n, sessionId: "A" },
      { slideId: 1n, sessionId: "B" },
      { slideId: 2n, sessionId: "B" },
      { slideId: 1n, sessionId: "C" },
    ]);

    const result = await getSlideRetention({ projectId: "1" });
    const retention = result.success.slideRetention;

    expect(retention[0].retentionRate).toBe(100); // 슬1: 3/3
    expect(retention[1].retentionRate).toBe(67);  // 슬2: 2/3
    expect(retention[2].retentionRate).toBe(33);  // 슬3: 1/3

    for (let i = 1; i < retention.length; i++) {
      expect(retention[i].retentionRate).toBeLessThanOrEqual(retention[i - 1].retentionRate);
    }
  });

  test("슬라이드 뷰 없으면 전부 0", async () => {
    repo.findProjectById.mockResolvedValue({ id: 1n });
    repo.findSlidesByProjectId.mockResolvedValue([{ id: 1n, title: "슬1", slideNum: 1n }]);
    repo.getSlideViewSessionPairs.mockResolvedValue([]);

    const result = await getSlideRetention({ projectId: "1" });
    expect(result.success.totalSessions).toBe(0);
    expect(result.success.slideRetention[0].retentionRate).toBe(0);
  });

  test("슬라이드 자체가 없으면 빈 배열", async () => {
    repo.findProjectById.mockResolvedValue({ id: 1n });
    repo.findSlidesByProjectId.mockResolvedValue([]);

    const result = await getSlideRetention({ projectId: "1" });
    expect(result.success.slideRetention).toEqual([]);
    expect(result.success.totalSessions).toBe(0);
  });
});

describe("getVideoExits (영상 이탈)", () => {
  test("세션당 마지막 이탈 시점만 카운트, 10초 버킷", async () => {
    repo.findVideoById.mockResolvedValue({ id: 10n, durationSeconds: 60, projectId: 1n });
    repo.getExitMaxTimePerSession.mockResolvedValue([
      { sessionId: "A", _max: { lastVideoTimeMs: 5000 } },   // 0ms 버킷
      { sessionId: "B", _max: { lastVideoTimeMs: 15000 } },  // 10000ms 버킷
      { sessionId: "C", _max: { lastVideoTimeMs: 8000 } },   // 0ms 버킷
    ]);
    repo.groupVideoEventsBySession.mockResolvedValue([
      { sessionId: "A" }, { sessionId: "B" }, { sessionId: "C" },
    ]);

    const result = await getVideoExits({ videoId: "10" });
    const exits = result.success.exits;

    expect(exits).toHaveLength(2);
    expect(exits[0]).toEqual({ timestampMs: 0, exitCount: 2, exitRate: 67 });
    expect(exits[1]).toEqual({ timestampMs: 10000, exitCount: 1, exitRate: 33 });
  });

  test("play 세션 0이면 빈 배열", async () => {
    repo.findVideoById.mockResolvedValue({ id: 10n, durationSeconds: 60, projectId: 1n });
    repo.getExitMaxTimePerSession.mockResolvedValue([]);
    repo.groupVideoEventsBySession.mockResolvedValue([]);

    const result = await getVideoExits({ videoId: "10" });
    expect(result.success.exits).toEqual([]);
  });
});

describe("getVideoRetention (영상 잔존률)", () => {
  test("30초 버킷, 첫 버킷 100%", async () => {
    repo.findVideoById.mockResolvedValue({ id: 10n, durationSeconds: 90, projectId: 1n });
    repo.getMaxTimestampPerSession.mockResolvedValue([
      { sessionId: "A", _max: { timestampMs: 80000 } },
      { sessionId: "B", _max: { timestampMs: 40000 } },
      { sessionId: "C", _max: { timestampMs: 20000 } },
    ]);

    const result = await getVideoRetention({ videoId: "10" });
    const retention = result.success.videoRetention;

    expect(retention[0]).toEqual({ timestampMs: 0, sessionCount: 3, retentionRate: 100 });
    expect(retention[1]).toEqual({ timestampMs: 30000, sessionCount: 2, retentionRate: 67 });
    expect(retention[2]).toEqual({ timestampMs: 60000, sessionCount: 1, retentionRate: 33 });
    expect(retention[3]).toEqual({ timestampMs: 90000, sessionCount: 0, retentionRate: 0 });
  });

  test("세션 없으면 빈 배열", async () => {
    repo.findVideoById.mockResolvedValue({ id: 10n, durationSeconds: 60, projectId: 1n });
    repo.getMaxTimestampPerSession.mockResolvedValue([]);

    const result = await getVideoRetention({ videoId: "10" });
    expect(result.success.totalSessions).toBe(0);
    expect(result.success.videoRetention).toEqual([]);
  });
});

describe("getSummary (체류시간)", () => {
  function setupSummaryMocks(overrides = {}) {
    repo.findProjectById.mockResolvedValue({ id: 1n });
    repo.groupPageViewsBySession.mockResolvedValue(overrides.sessions ?? []);
    repo.findVideosByProjectId.mockResolvedValue(overrides.videos ?? []);
    repo.getAvgDuration.mockResolvedValue([{ avg_duration: overrides.avgDuration ?? null }]);
    repo.findLastSlideByProjectId.mockResolvedValue([]);
    repo.findSlidesByProjectId.mockResolvedValue([]);
    repo.countReactionsByTarget.mockResolvedValue(0);
    repo.countCommentsByTarget.mockResolvedValue(0);
  }

  test("maxDurationSeconds = max(영상길이) + 1800 전달", async () => {
    setupSummaryMocks({
      sessions: [{ sessionId: "A" }],
      videos: [{ id: 10n, durationSeconds: 120 }, { id: 11n, durationSeconds: 300 }],
      avgDuration: 45.6,
    });

    await getSummary({ projectId: "1" });

    // max(120, 300) + 1800 = 2100
    expect(repo.getAvgDuration).toHaveBeenCalledWith(1, 2100);
  });

  test("영상 없으면 maxDurationSeconds = 1800", async () => {
    setupSummaryMocks();

    await getSummary({ projectId: "1" });

    expect(repo.getAvgDuration).toHaveBeenCalledWith(1, 1800);
  });

  test("avgDuration 정상 반올림", async () => {
    setupSummaryMocks({ sessions: [{ sessionId: "A" }], avgDuration: 45.6 });

    const result = await getSummary({ projectId: "1" });
    expect(result.success.avgDurationSeconds).toBe(46);
  });

  test("avgDuration null이면 0", async () => {
    setupSummaryMocks();

    const result = await getSummary({ projectId: "1" });
    expect(result.success.avgDurationSeconds).toBe(0);
  });
});
