import {
  recordPageView,
  recordSlideView,
  recordVideoEvent,
  recordExit,
  getSummary,
  getSlideAnalytics,
  getVideoTimeline,
  getVideoExits,
} from "../services/analytics.service.js";

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: 분석 데이터 수집 및 조회 API
 */

/**
 * @swagger
 * /analytics/pageview:
 *   post:
 *     summary: 페이지 조회 기록
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *             properties:
 *               projectId:
 *                 type: integer
 *                 description: 프로젝트 ID
 *     responses:
 *       200:
 *         description: 기록 성공
 */
export const handleRecordPageView = async (req, res, next) => {
  try {
    const result = await recordPageView({
      projectId: req.body.projectId,
      sessionId: req.user?.sessionId,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
};

/**
 * @swagger
 * /analytics/slide-view:
 *   post:
 *     summary: 슬라이드 조회 기록
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - slideId
 *             properties:
 *               slideId:
 *                 type: integer
 *                 description: 슬라이드 ID
 *     responses:
 *       200:
 *         description: 기록 성공
 */
export const handleRecordSlideView = async (req, res, next) => {
  try {
    const result = await recordSlideView({
      slideId: req.body.slideId,
      sessionId: req.user?.sessionId,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
};

/**
 * @swagger
 * /analytics/video-event:
 *   post:
 *     summary: 영상 이벤트 기록
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - videoId
 *               - eventType
 *               - timestampMs
 *             properties:
 *               videoId:
 *                 type: integer
 *                 description: 영상 ID
 *               eventType:
 *                 type: string
 *                 enum: [play, pause, seek]
 *                 description: 이벤트 타입
 *               timestampMs:
 *                 type: integer
 *                 description: 영상 내 타임스탬프 (ms)
 *     responses:
 *       200:
 *         description: 기록 성공
 */
export const handleRecordVideoEvent = async (req, res, next) => {
  try {
    const result = await recordVideoEvent({
      videoId: req.body.videoId,
      eventType: req.body.eventType,
      timestampMs: req.body.timestampMs,
      sessionId: req.user?.sessionId,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
};

/**
 * @swagger
 * /analytics/exit:
 *   post:
 *     summary: 이탈 지점 기록
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *             properties:
 *               projectId:
 *                 type: integer
 *                 description: 프로젝트 ID
 *               lastSlideId:
 *                 type: integer
 *                 description: 마지막으로 본 슬라이드 ID
 *               lastVideoId:
 *                 type: integer
 *                 description: 마지막으로 본 영상 ID
 *               lastVideoTimeMs:
 *                 type: integer
 *                 description: 영상 이탈 시점 (ms)
 *     responses:
 *       200:
 *         description: 기록 성공
 */
export const handleRecordExit = async (req, res, next) => {
  try {
    const result = await recordExit({
      projectId: req.body.projectId,
      sessionId: req.user?.sessionId,
      lastSlideId: req.body.lastSlideId,
      lastVideoId: req.body.lastVideoId,
      lastVideoTimeMs: req.body.lastVideoTimeMs,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
};

/**
 * @swagger
 * /presentations/{projectId}/analytics/summary:
 *   get:
 *     summary: 프로젝트 분석 요약 조회
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 프로젝트 ID
 *     responses:
 *       200:
 *         description: 분석 요약
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsSummaryResponse'
 */
export const handleGetSummary = async (req, res, next) => {
  try {
    const result = await getSummary({
      projectId: req.params.projectId,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
};

/**
 * @swagger
 * /presentations/{projectId}/analytics/slides:
 *   get:
 *     summary: 슬라이드별 분석 조회
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 프로젝트 ID
 *     responses:
 *       200:
 *         description: 슬라이드별 분석
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SlideAnalyticsResponse'
 */
export const handleGetSlideAnalytics = async (req, res, next) => {
  try {
    const result = await getSlideAnalytics({
      projectId: req.params.projectId,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
};

/**
 * @swagger
 * /videos/{videoId}/analytics/timeline:
 *   get:
 *     summary: 영상 타임라인 분석 조회
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 영상 ID
 *     responses:
 *       200:
 *         description: 타임라인 분석
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VideoTimelineResponse'
 */
export const handleGetVideoTimeline = async (req, res, next) => {
  try {
    const result = await getVideoTimeline({
      videoId: req.params.videoId,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
};

/**
 * @swagger
 * /videos/{videoId}/analytics/exits:
 *   get:
 *     summary: 영상 이탈 분석 조회
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 영상 ID
 *     responses:
 *       200:
 *         description: 이탈 분석
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VideoExitsResponse'
 */
export const handleGetVideoExits = async (req, res, next) => {
  try {
    const result = await getVideoExits({
      videoId: req.params.videoId,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
};

/**
 * @swagger
 * components:
 *   schemas:
 *     AnalyticsSummaryResponse:
 *       type: object
 *       properties:
 *         resultType:
 *           type: string
 *           example: SUCCESS
 *         error:
 *           nullable: true
 *         success:
 *           type: object
 *           properties:
 *             totalViews:
 *               type: integer
 *               description: 총 조회수 (고유 세션)
 *             avgDurationSeconds:
 *               type: integer
 *               description: 평균 체류 시간 (초)
 *             completionRate:
 *               type: integer
 *               description: 완독률 (%)
 *             totalFeedbackCount:
 *               type: integer
 *               description: 총 피드백 수
 *
 *     SlideAnalyticsResponse:
 *       type: object
 *       properties:
 *         resultType:
 *           type: string
 *           example: SUCCESS
 *         error:
 *           nullable: true
 *         success:
 *           type: object
 *           properties:
 *             slides:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   slideId:
 *                     type: string
 *                   slideNum:
 *                     type: integer
 *                   title:
 *                     type: string
 *                   viewCount:
 *                     type: integer
 *                   exitCount:
 *                     type: integer
 *                   exitRate:
 *                     type: integer
 *                   reactionCount:
 *                     type: integer
 *                   commentCount:
 *                     type: integer
 *                   feedbackCount:
 *                     type: integer
 *
 *     VideoTimelineResponse:
 *       type: object
 *       properties:
 *         resultType:
 *           type: string
 *           example: SUCCESS
 *         error:
 *           nullable: true
 *         success:
 *           type: object
 *           properties:
 *             timeline:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   timestampMs:
 *                     type: integer
 *                   reactionCount:
 *                     type: integer
 *                   commentCount:
 *                     type: integer
 *                   feedbackCount:
 *                     type: integer
 *
 *     VideoExitsResponse:
 *       type: object
 *       properties:
 *         resultType:
 *           type: string
 *           example: SUCCESS
 *         error:
 *           nullable: true
 *         success:
 *           type: object
 *           properties:
 *             exits:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   timestampMs:
 *                     type: integer
 *                   exitCount:
 *                     type: integer
 *                   exitRate:
 *                     type: integer
 */
