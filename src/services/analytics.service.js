import {
  AnalyticsProjectNotFoundError,
  AnalyticsVideoNotFoundError,
  AnalyticsSlideNotFoundError,
  AnalyticsInvalidParameterError,
  AnalyticsSessionRequiredError,
} from "../errors/analytics.error.js";
import * as analyticsRepository from "../repositories/analytics.repository.js";

// ==================== 수집 API ====================

/**
 * 페이지 조회 기록
 * POST /analytics/pageview
 */
export const recordPageView = async ({ projectId, sessionId }) => {
  if (!sessionId) {
    throw new AnalyticsSessionRequiredError();
  }

  const pid = requireProjectId(projectId);

  const project = await analyticsRepository.findProjectById(pid);
  if (!project) {
    throw new AnalyticsProjectNotFoundError({ projectId: pid });
  }

  await analyticsRepository.createPageView({ projectId: pid, sessionId });

  return {
    resultType: "SUCCESS",
    error: null,
    success: { ok: true },
  };
};

/**
 * 슬라이드 조회 기록
 * POST /analytics/slide-view
 */
export const recordSlideView = async ({ slideId, sessionId }) => {
  if (!sessionId) {
    throw new AnalyticsSessionRequiredError();
  }

  const sid = requireSlideId(slideId);

  const slide = await analyticsRepository.findSlideById(sid);
  if (!slide) {
    throw new AnalyticsSlideNotFoundError({ slideId: sid });
  }

  await analyticsRepository.createSlideView({
    projectId: slide.projectId,
    slideId: sid,
    sessionId,
  });

  return {
    resultType: "SUCCESS",
    error: null,
    success: { ok: true },
  };
};

/**
 * 영상 이벤트 기록
 * POST /analytics/video-event
 */
export const recordVideoEvent = async ({ videoId, eventType, timestampMs, sessionId }) => {
  if (!sessionId) {
    throw new AnalyticsSessionRequiredError();
  }

  const vid = requireVideoId(videoId);
  const ts = toInt(timestampMs);

  if (!["play", "pause", "seek"].includes(eventType)) {
    throw new AnalyticsInvalidParameterError({ eventType }, "이벤트 타입이 올바르지 않습니다.");
  }

  if (!Number.isInteger(ts) || ts < 0) {
    throw new AnalyticsInvalidParameterError(
      { timestampMs },
      "타임스탬프는 0 이상의 정수여야 합니다."
    );
  }

  const video = await analyticsRepository.findVideoById(vid);
  if (!video) {
    throw new AnalyticsVideoNotFoundError({ videoId: vid });
  }

  await analyticsRepository.createVideoEvent({
    videoId: vid,
    sessionId,
    eventType,
    timestampMs: ts,
  });

  return {
    resultType: "SUCCESS",
    error: null,
    success: { ok: true },
  };
};

/**
 * 이탈 지점 기록
 * POST /analytics/exit
 */
export const recordExit = async ({
  projectId,
  sessionId,
  lastSlideId,
  lastVideoId,
  lastVideoTimeMs,
}) => {
  if (!sessionId) {
    throw new AnalyticsSessionRequiredError();
  }

  const pid = requireProjectId(projectId);

  const project = await analyticsRepository.findProjectById(pid);
  if (!project) {
    throw new AnalyticsProjectNotFoundError({ projectId: pid });
  }

  const data = {
    projectId: pid,
    sessionId,
  };

  if (lastSlideId) {
    data.lastSlideId = toInt(lastSlideId);
  }
  if (lastVideoId) {
    data.lastVideoId = toInt(lastVideoId);
  }
  if (lastVideoTimeMs !== undefined && lastVideoTimeMs !== null) {
    data.lastVideoTimeMs = toInt(lastVideoTimeMs);
  }

  await analyticsRepository.createExit(data);

  return {
    resultType: "SUCCESS",
    error: null,
    success: { ok: true },
  };
};

// ==================== 조회 API ====================

/**
 * 기본 지표 조회
 * GET /presentations/:id/analytics/summary
 */
export const getSummary = async ({ projectId }) => {
  const pid = requireProjectId(projectId);

  const project = await analyticsRepository.findProjectById(pid);
  if (!project) {
    throw new AnalyticsProjectNotFoundError({ projectId: pid });
  }

  // 총 조회수 (고유 세션 기준)
  const uniqueSessions = await analyticsRepository.groupPageViewsBySession(pid);
  const totalViews = uniqueSessions.length;

  // 평균 체류 시간 계산
  const avgDurationResult = await analyticsRepository.getAvgDuration(pid);
  const avgDuration = avgDurationResult[0]?.avg_duration
    ? Math.round(Number(avgDurationResult[0].avg_duration))
    : 0;

  // 완독률 계산 (마지막 슬라이드까지 본 세션 비율)
  const slides = await analyticsRepository.findLastSlideByProjectId(pid);

  let completionRate = 0;
  if (slides.length > 0 && totalViews > 0) {
    const lastSlideId = slides[0].id;
    const completedSessions = await analyticsRepository.groupSlideViewsBySlideIdAndSession({
      projectId: pid,
      slideId: lastSlideId,
    });
    completionRate = Math.round((completedSessions.length / totalViews) * 100);
  }

  // 총 피드백 수 (리액션 + 댓글)
  const allSlides = await analyticsRepository.findSlidesByProjectId(pid);
  const slideIds = allSlides.map((s) => s.id);

  const [reactionCount, commentCount] = await Promise.all([
    analyticsRepository.countReactionsByTarget({ targetType: "slide", targetIds: slideIds }),
    analyticsRepository.countCommentsByTarget({ targetType: "slide", targetIds: slideIds }),
  ]);

  // 영상 관련 피드백도 포함
  const videos = await analyticsRepository.findVideosByProjectId(pid);
  const videoIds = videos.map((v) => v.id);

  const [videoReactionCount, videoCommentCount] = await Promise.all([
    analyticsRepository.countReactionsByTarget({ targetType: "video", targetIds: videoIds }),
    analyticsRepository.countCommentsByTarget({ targetType: "video", targetIds: videoIds }),
  ]);

  const totalFeedbackCount = reactionCount + commentCount + videoReactionCount + videoCommentCount;
 
  return {
    resultType: "SUCCESS",
    error: null,
    success: {
      videoIds: videoIds.map((id) => id.toString()),
      totalViews,
      avgDurationSeconds: avgDuration,
      completionRate,
      totalFeedbackCount,
    },
  };
};

/**
 * 슬라이드별 분석
 * GET /presentations/:id/analytics/slides
 */
export const getSlideAnalytics = async ({ projectId }) => {
  const pid = requireProjectId(projectId);

  const project = await analyticsRepository.findProjectById(pid);
  if (!project) {
    throw new AnalyticsProjectNotFoundError({ projectId: pid });
  }

  // 슬라이드 목록 조회
  const slides = await analyticsRepository.findSlidesByProjectId(pid);
  const slideIds = slides.map((s) => s.id);

  // 슬라이드별 조회수 (고유 세션)
  const slideViews = await analyticsRepository.groupSlideViewsBySlideAndSession(slideIds);

  const slideViewCount = {};
  slideViews.forEach((sv) => {
    const key = sv.slideId.toString();
    slideViewCount[key] = (slideViewCount[key] || 0) + 1;
  });

  // 슬라이드별 이탈 수
  const slideExits = await analyticsRepository.groupExitsByLastSlide(slideIds);

  const slideExitCount = {};
  slideExits.forEach((se) => {
    if (se.lastSlideId) {
      slideExitCount[se.lastSlideId.toString()] = se._count._all;
    }
  });

  // 슬라이드별 피드백 (리액션 + 댓글)
  const [reactions, comments] = await Promise.all([
    analyticsRepository.groupReactionsByTargetId({ targetType: "slide", targetIds: slideIds }),
    analyticsRepository.groupCommentsByTargetId({ targetType: "slide", targetIds: slideIds }),
  ]);

  const slideReactionCount = {};
  reactions.forEach((r) => {
    slideReactionCount[r.targetId.toString()] = r._count._all;
  });

  const slideCommentCount = {};
  comments.forEach((c) => {
    slideCommentCount[c.targetId.toString()] = c._count._all;
  });

  // 결과 조합
  const result = slides.map((slide) => {
    const slideIdStr = slide.id.toString();
    const viewCount = slideViewCount[slideIdStr] || 0;
    const exitCount = slideExitCount[slideIdStr] || 0;
    const reactionCnt = slideReactionCount[slideIdStr] || 0;
    const commentCnt = slideCommentCount[slideIdStr] || 0;

    // 이탈률 계산
    const exitRate = viewCount > 0 ? Math.round((exitCount / viewCount) * 100) : 0;

    return {
      slideId: slideIdStr,
      slideNum: slide.slideNum ? Number(slide.slideNum) : null,
      title: slide.title,
      viewCount,
      exitCount,
      exitRate,
      reactionCount: reactionCnt,
      commentCount: commentCnt,
      feedbackCount: reactionCnt + commentCnt,
    };
  });

  return {
    resultType: "SUCCESS",
    error: null,
    success: { slides: result },
  };
};

/**
 * 영상 시간대별 피드백 분포
 * GET /videos/:id/analytics/timeline
 */
export const getVideoTimeline = async ({ videoId }) => {
  const vid = requireVideoId(videoId);

  const video = await analyticsRepository.findVideoById(vid);
  if (!video) {
    throw new AnalyticsVideoNotFoundError({ videoId: vid });
  }

  // 5초 단위로 그룹화하여 피드백 집계
  const [reactions, comments] = await Promise.all([
    analyticsRepository.findVideoReactionsWithTimestamp(vid),
    analyticsRepository.findVideoCommentsWithTimestamp(vid),
  ]);

  // 5초(5000ms) 단위로 그룹화
  const intervalMs = 5000;
  const timelineMap = {};

  reactions.forEach((r) => {
    if (r.timestampMs !== null) {
      const bucket = Math.floor(r.timestampMs / intervalMs) * intervalMs;
      if (!timelineMap[bucket]) {
        timelineMap[bucket] = { reactionCount: 0, commentCount: 0 };
      }
      timelineMap[bucket].reactionCount++;
    }
  });

  comments.forEach((c) => {
    if (c.timestampMs !== null) {
      const bucket = Math.floor(c.timestampMs / intervalMs) * intervalMs;
      if (!timelineMap[bucket]) {
        timelineMap[bucket] = { reactionCount: 0, commentCount: 0 };
      }
      timelineMap[bucket].commentCount++;
    }
  });

  // 정렬된 타임라인 배열 생성
  const timeline = Object.entries(timelineMap)
    .map(([ts, counts]) => ({
      timestampMs: Number(ts),
      reactionCount: counts.reactionCount,
      commentCount: counts.commentCount,
      feedbackCount: counts.reactionCount + counts.commentCount,
    }))
    .sort((a, b) => a.timestampMs - b.timestampMs);

  return {
    resultType: "SUCCESS",
    error: null,
    success: { timeline },
  };
};

/**
 * 영상 구간별 이탈률
 * GET /videos/:id/analytics/exits
 */
export const getVideoExits = async ({ videoId }) => {
  const vid = requireVideoId(videoId);

  const video = await analyticsRepository.findVideoById(vid);
  if (!video) {
    throw new AnalyticsVideoNotFoundError({ videoId: vid });
  }

  // 영상 관련 이탈 기록 조회
  const exits = await analyticsRepository.findExitsByVideoId(vid);

  // 10초(10000ms) 단위로 그룹화
  const intervalMs = 10000;
  const exitMap = {};

  exits.forEach((e) => {
    if (e.lastVideoTimeMs !== null) {
      const bucket = Math.floor(e.lastVideoTimeMs / intervalMs) * intervalMs;
      if (!exitMap[bucket]) {
        exitMap[bucket] = new Set();
      }
      exitMap[bucket].add(e.sessionId);
    }
  });

  // 총 세션 수 (영상을 재생한 세션)
  const totalSessions = await analyticsRepository.groupVideoEventsBySession(vid);
  const totalSessionCount = totalSessions.length || 1; // 0 방지

  // 정렬된 이탈률 배열 생성
  const exitRates = Object.entries(exitMap)
    .map(([ts, sessions]) => ({
      timestampMs: Number(ts),
      exitCount: sessions.size,
      exitRate: Math.round((sessions.size / totalSessionCount) * 100),
    }))
    .sort((a, b) => a.timestampMs - b.timestampMs);

  return {
    resultType: "SUCCESS",
    error: null,
    success: { exits: exitRates },
  };
};

// ==================== Helper Functions ====================

const toInt = (value) => {
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isInteger(n) ? n : NaN;
};

const requireProjectId = (projectId) => {
  const pid = toInt(projectId);
  if (!Number.isInteger(pid) || pid <= 0) {
    throw new AnalyticsInvalidParameterError({ projectId }, "프로젝트 ID가 올바르지 않습니다.");
  }
  return pid;
};

const requireVideoId = (videoId) => {
  const vid = toInt(videoId);
  if (!Number.isInteger(vid) || vid <= 0) {
    throw new AnalyticsInvalidParameterError({ videoId }, "영상 ID가 올바르지 않습니다.");
  }
  return vid;
};

const requireSlideId = (slideId) => {
  const sid = toInt(slideId);
  if (!Number.isInteger(sid) || sid <= 0) {
    throw new AnalyticsInvalidParameterError({ slideId }, "슬라이드 ID가 올바르지 않습니다.");
  }
  return sid;
};
