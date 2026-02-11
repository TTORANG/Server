import {
  AnalyticsProjectNotFoundError,
  AnalyticsVideoNotFoundError,
  AnalyticsSlideNotFoundError,
  AnalyticsInvalidParameterError,
  AnalyticsSessionRequiredError,
} from "../errors/analytics.error.js";
import * as analyticsRepository from "../repositories/analytics.repository.js";
import * as shareLinkRepository from "../repositories/shareLink.repository.js";
import { findRecentVideoCommentsByProjectId } from "../repositories/comment.repository.js";
import { findSlideByTimestamp } from "../repositories/video.repository.js";
import { toPublicStorageUrl } from "../utils/storageUrl.util.js";

// ==================== 수집 API ====================

/**
 * 페이지 조회 기록
 * POST /analytics/pageview
 */
export const recordPageView = async ({ shareToken, sessionId }) => {
  if (!sessionId) {
    throw new AnalyticsSessionRequiredError();
  }

  const pid = await resolveProjectIdByShareToken(shareToken);

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
  shareToken,
  sessionId,
  lastSlideId,
  lastVideoId,
  lastVideoTimeMs,
}) => {
  if (!sessionId) {
    throw new AnalyticsSessionRequiredError();
  }

  const pid = await resolveProjectIdByShareToken(shareToken);

  const data = {
    projectId: pid,
    sessionId,
  };

  if (lastSlideId) {
    const sid = toInt(lastSlideId);
    const slide = await analyticsRepository.findSlideById(sid);
    if (!slide) {
      throw new AnalyticsSlideNotFoundError({ slideId: sid });
    }
    data.lastSlideId = sid;
  }
  if (lastVideoId) {
    const vid = toInt(lastVideoId);
    const video = await analyticsRepository.findVideoById(vid);
    if (!video) {
      throw new AnalyticsVideoNotFoundError({ videoId: vid });
    }
    data.lastVideoId = vid;
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

  // 슬라이드별 이탈 수 (세션별 마지막으로 본 슬라이드 = 이탈 지점)
  const lastSlidePerSession = {};
  slideViews.forEach((sv) => {
    const sid = sv.sessionId;
    const viewedAt = sv._max.createdAt;
    if (!lastSlidePerSession[sid] || viewedAt > lastSlidePerSession[sid].viewedAt) {
      lastSlidePerSession[sid] = { slideId: sv.slideId, viewedAt };
    }
  });

  const slideExitCount = {};
  Object.values(lastSlidePerSession).forEach((entry) => {
    const key = entry.slideId.toString();
    slideExitCount[key] = (slideExitCount[key] || 0) + 1;
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

  // 총 고유 세션 수 (이탈률 분모)
  const totalSessions = Object.keys(lastSlidePerSession).length;

  // 결과 조합
  const result = slides.map((slide) => {
    const slideIdStr = slide.id.toString();
    const viewCount = slideViewCount[slideIdStr] || 0;
    const exitCount = slideExitCount[slideIdStr] || 0;
    const reactionCnt = slideReactionCount[slideIdStr] || 0;
    const commentCnt = slideCommentCount[slideIdStr] || 0;

    // 이탈률 계산 (분모 = 총 고유 세션)
    const exitRate = totalSessions > 0 ? Math.round((exitCount / totalSessions) * 100) : 0;

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
  const totalSessionCount = totalSessions.length;

  if (totalSessionCount === 0) {
    return {
      resultType: "SUCCESS",
      error: null,
      success: { exits: [] },
    };
  }

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

/**
 * 프로젝트의 최근 댓글 피드백 조회
 * GET /presentations/:id/analytics/recent-comments
 */
export const getRecentComments = async ({ projectId, limit = 10 }) => {
  const pid = requireProjectId(projectId);

  const project = await analyticsRepository.findProjectById(pid);
  if (!project) {
    throw new AnalyticsProjectNotFoundError({ projectId: pid });
  }

  // limit 검증
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));

  // 프로젝트의 최근 영상 댓글 조회
  const comments = await findRecentVideoCommentsByProjectId({
    projectId: pid,
    limit: safeLimit,
  });

  // 각 댓글에 대해 슬라이드 정보 조회
  const commentsWithSlides = await Promise.all(
    comments.map(async (comment) => {
      const slideInfo = await findSlideByTimestamp(
        BigInt(comment.targetId),
        comment.timestampMs
      );

      return {
        commentId: comment.id.toString(),
        content: comment.content,
        timestampMs: comment.timestampMs,
        createdAt: comment.createdAt,
        user: {
          userId: comment.user.id.toString(),
          nickName: comment.user.nickName || comment.user.name || "익명 사용자",
          name: comment.user.name,
        },
        slide: slideInfo
          ? {
              slideId: slideInfo.slideId.toString(),
              slideNum: slideInfo.slideNum ? Number(slideInfo.slideNum) : null,
              title: slideInfo.title,
              imageUrl: toPublicStorageUrl(slideInfo.imageUrl),
            }
          : null,
      };
    })
  );

  return {
    resultType: "SUCCESS",
    error: null,
    success: { comments: commentsWithSlides },
  };
};

// ==================== Helper Functions ====================

const resolveProjectIdByShareToken = async (shareToken) => {
  if (!shareToken) {
    throw new AnalyticsInvalidParameterError({ shareToken }, "shareToken이 필요합니다.");
  }

  const shareLink = await shareLinkRepository.findProjectIdByShareToken(shareToken);
  if (!shareLink) {
    throw new AnalyticsProjectNotFoundError({ shareToken });
  }
  if (!shareLink.isActive) {
    throw new AnalyticsInvalidParameterError({ shareToken }, "비활성화된 공유 링크입니다.");
  }
  if (shareLink.expiredAt && shareLink.expiredAt < new Date()) {
    throw new AnalyticsInvalidParameterError({ shareToken }, "만료된 공유 링크입니다.");
  }

  return Number(shareLink.projectId);
};

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

// ==================== Retention Rate API ====================

/**
 * 슬라이드별 잔존률
 * GET /presentations/:id/analytics/slide-retention
 */
export const getSlideRetention = async ({ projectId }) => {
  const pid = requireProjectId(projectId);

  const project = await analyticsRepository.findProjectById(pid);
  if (!project) {
    throw new AnalyticsProjectNotFoundError({ projectId: pid });
  }

  // 슬라이드 목록 조회 (slideNum 순서)
  const slides = await analyticsRepository.findSlidesByProjectId(pid);
  if (slides.length === 0) {
    return {
      resultType: "SUCCESS",
      error: null,
      success: { totalSessions: 0, slideRetention: [] },
    };
  }

  // 슬라이드-세션 쌍 조회
  const slideViewPairs = await analyticsRepository.getSlideViewSessionPairs(pid);

  // slideId → slideNum 매핑
  const slideNumMap = {};
  slides.forEach((s) => {
    slideNumMap[s.id.toString()] = s.slideNum ? Number(s.slideNum) : 0;
  });

  // 세션별 최대 도달 슬라이드 번호 계산
  const sessionMaxSlideNum = {};
  slideViewPairs.forEach((pair) => {
    const sid = pair.sessionId;
    const slideNum = slideNumMap[pair.slideId.toString()] || 0;
    if (!sessionMaxSlideNum[sid] || slideNum > sessionMaxSlideNum[sid]) {
      sessionMaxSlideNum[sid] = slideNum;
    }
  });

  // baseline = 총 고유 세션 수
  const totalSessions = Object.keys(sessionMaxSlideNum).length;

  if (totalSessions === 0) {
    return {
      resultType: "SUCCESS",
      error: null,
      success: {
        totalSessions: 0,
        slideRetention: slides.map((s) => ({
          slideId: s.id.toString(),
          slideNum: s.slideNum ? Number(s.slideNum) : null,
          title: s.title,
          sessionCount: 0,
          retentionRate: 0,
        })),
      },
    };
  }

  // 각 슬라이드별 잔존률 계산 (max slideNum >= 해당 slideNum인 세션 수)
  const slideRetention = slides.map((slide) => {
    const slideNum = slide.slideNum ? Number(slide.slideNum) : 0;
    const sessionCount = Object.values(sessionMaxSlideNum).filter(
      (maxNum) => maxNum >= slideNum
    ).length;
    const retentionRate = Math.round((sessionCount / totalSessions) * 100);

    return {
      slideId: slide.id.toString(),
      slideNum: slide.slideNum ? Number(slide.slideNum) : null,
      title: slide.title,
      sessionCount,
      retentionRate,
    };
  });

  return {
    resultType: "SUCCESS",
    error: null,
    success: {
      totalSessions,
      slideRetention,
    },
  };
};

/**
 * 영상 시청 잔존률 (30초 단위)
 * GET /videos/:id/analytics/retention
 */
export const getVideoRetention = async ({ videoId }) => {
  const vid = requireVideoId(videoId);

  const video = await analyticsRepository.findVideoById(vid);
  if (!video) {
    throw new AnalyticsVideoNotFoundError({ videoId: vid });
  }

  // 세션별 최대 시청 시점 조회
  const sessionMaxTimestamps = await analyticsRepository.getMaxTimestampPerSession(vid);

  if (sessionMaxTimestamps.length === 0) {
    return {
      resultType: "SUCCESS",
      error: null,
      success: {
        totalSessions: 0,
        durationSeconds: video.durationSeconds,
        intervalMs: 30000,
        videoRetention: [],
      },
    };
  }

  // baseline: 영상을 시작한 총 세션 수
  const totalSessions = sessionMaxTimestamps.length;

  // 영상 길이 결정 (ms 단위)
  const durationMs = video.durationSeconds
    ? video.durationSeconds * 1000
    : Math.max(...sessionMaxTimestamps.map((s) => s._max.timestampMs || 0));

  // 30초(30000ms) 단위 버킷 생성
  const intervalMs = 30000;
  const buckets = [];
  for (let ts = 0; ts <= durationMs; ts += intervalMs) {
    buckets.push(ts);
  }

  // 각 버킷별 잔존률 계산
  const videoRetention = buckets.map((bucketTs) => {
    // 해당 시점까지 도달한 세션 수
    const sessionCount = sessionMaxTimestamps.filter(
      (s) => (s._max.timestampMs || 0) >= bucketTs
    ).length;

    const retentionRate = Math.round((sessionCount / totalSessions) * 100);

    return {
      timestampMs: bucketTs,
      sessionCount,
      retentionRate,
    };
  });

  return {
    resultType: "SUCCESS",
    error: null,
    success: {
      totalSessions,
      durationSeconds: video.durationSeconds,
      intervalMs,
      videoRetention,
    },
  };
};
