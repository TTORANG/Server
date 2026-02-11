import { prisma } from "../db.config.js";

// ==================== 조회 ====================

export const findProjectById = (projectId) =>
  prisma.project.findFirst({
    where: { id: projectId, isDeleted: false },
    select: { id: true },
  });

export const findVideoById = (videoId) =>
  prisma.video.findFirst({
    where: { id: videoId, deletedAt: null },
    select: { id: true, durationSeconds: true, projectId: true },
  });

export const findSlideById = (slideId) =>
  prisma.slide.findFirst({
    where: { id: slideId, isDeleted: false },
    select: { id: true, projectId: true },
  });

export const findSlidesByProjectId = (projectId) =>
  prisma.slide.findMany({
    where: { projectId, isDeleted: false },
    orderBy: { slideNum: "asc" },
    select: { id: true, title: true, slideNum: true },
  });

export const findLastSlideByProjectId = (projectId) =>
  prisma.slide.findMany({
    where: { projectId, isDeleted: false },
    orderBy: { slideNum: "desc" },
    take: 1,
    select: { id: true },
  });

export const findVideosByProjectId = (projectId) =>
  prisma.video.findMany({
    where: { projectId, deletedAt: null },
    select: { id: true, durationSeconds: true },
  });

// ==================== Analytics 생성 ====================

export const createPageView = ({ projectId, sessionId }) =>
  prisma.analyticsPageView.create({
    data: { projectId, sessionId },
  });

export const createSlideView = ({ projectId, slideId, sessionId }) =>
  prisma.analyticsSlideView.create({
    data: { projectId, slideId, sessionId },
  });

export const createVideoEvent = ({ videoId, sessionId, eventType, timestampMs }) =>
  prisma.analyticsVideoEvent.create({
    data: { videoId, sessionId, eventType, timestampMs },
  });

export const createExit = (data) => prisma.analyticsExit.create({ data });

// ==================== Analytics 집계 ====================

export const groupPageViewsBySession = (projectId) =>
  prisma.analyticsPageView.groupBy({
    by: ["sessionId"],
    where: { projectId },
  });

export const getAvgDuration = (projectId, maxDurationSeconds) =>
  prisma.$queryRaw`
    WITH pageviews AS (
      SELECT
        session_id,
        created_at AS pv_start,
        LEAD(created_at) OVER (PARTITION BY session_id ORDER BY created_at) AS next_pv_start
      FROM analytics_page_view
      WHERE project_id = ${projectId}
    ),
    all_events AS (
      SELECT session_id, created_at AS event_time
      FROM analytics_page_view WHERE project_id = ${projectId}
      UNION ALL
      SELECT session_id, created_at AS event_time
      FROM analytics_slide_view WHERE project_id = ${projectId}
      UNION ALL
      SELECT ave.session_id, ave.created_at AS event_time
      FROM analytics_video_event ave
      INNER JOIN video v ON ave.video_id = v.id
      WHERE v.project_id = ${projectId}
    ),
    visit_durations AS (
      SELECT
        TIMESTAMPDIFF(SECOND, pv.pv_start, MAX(ae.event_time)) AS duration_seconds
      FROM pageviews pv
      LEFT JOIN all_events ae ON ae.session_id = pv.session_id
        AND ae.event_time >= pv.pv_start
        AND (pv.next_pv_start IS NULL OR ae.event_time < pv.next_pv_start)
      GROUP BY pv.session_id, pv.pv_start
    )
    SELECT AVG(duration_seconds) AS avg_duration
    FROM visit_durations
    WHERE duration_seconds BETWEEN 1 AND ${maxDurationSeconds}
  `;

export const groupSlideViewsBySlideAndSession = (slideIds) =>
  prisma.analyticsSlideView.groupBy({
    by: ["slideId", "sessionId"],
    where: { slideId: { in: slideIds } },
    _max: { createdAt: true },
  });

export const groupSlideViewsBySlideIdAndSession = ({ projectId, slideId }) =>
  prisma.analyticsSlideView.groupBy({
    by: ["sessionId"],
    where: { projectId, slideId },
  });

export const getExitMaxTimePerSession = (videoId) =>
  prisma.analyticsExit.groupBy({
    by: ["sessionId"],
    where: { lastVideoId: videoId, lastVideoTimeMs: { not: null } },
    _max: { lastVideoTimeMs: true },
  });

export const groupVideoEventsBySession = (videoId) =>
  prisma.analyticsVideoEvent.groupBy({
    by: ["sessionId"],
    where: { videoId, eventType: "play" },
  });

// ==================== Reaction/Comment 집계 ====================

export const countReactionsByTarget = ({ targetType, targetIds }) =>
  prisma.reaction.count({
    where: {
      targetType,
      isDeleted: false,
      targetId: { in: targetIds },
    },
  });

export const countCommentsByTarget = ({ targetType, targetIds }) =>
  prisma.comment.count({
    where: {
      targetType,
      isDeleted: false,
      targetId: { in: targetIds },
    },
  });

export const groupReactionsByTargetId = ({ targetType, targetIds }) =>
  prisma.reaction.groupBy({
    by: ["targetId"],
    where: {
      targetType,
      isDeleted: false,
      targetId: { in: targetIds },
    },
    _count: { _all: true },
  });

export const groupCommentsByTargetId = ({ targetType, targetIds }) =>
  prisma.comment.groupBy({
    by: ["targetId"],
    where: {
      targetType,
      isDeleted: false,
      targetId: { in: targetIds },
    },
    _count: { _all: true },
  });

export const findVideoReactionsWithTimestamp = (videoId) =>
  prisma.reaction.findMany({
    where: {
      targetType: "video",
      targetId: videoId,
      isDeleted: false,
      timestampMs: { not: null },
    },
    select: { timestampMs: true, emojiType: true },
  });

export const findVideoCommentsWithTimestamp = (videoId) =>
  prisma.comment.findMany({
    where: {
      targetType: "video",
      targetId: videoId,
      isDeleted: false,
      timestampMs: { not: null },
    },
    select: { timestampMs: true },
  });

// ==================== Retention Rate 집계 ====================

// 슬라이드-세션 쌍 조회 (잔존률 계산용)
export const getSlideViewSessionPairs = (projectId) =>
  prisma.analyticsSlideView.groupBy({
    by: ["slideId", "sessionId"],
    where: { projectId },
  });

// 영상별 세션당 최대 시청 시점 조회
export const getMaxTimestampPerSession = (videoId) =>
  prisma.analyticsVideoEvent.groupBy({
    by: ["sessionId"],
    where: { videoId, eventType: { in: ["play", "pause", "seek"] } },
    _max: { timestampMs: true },
  });
