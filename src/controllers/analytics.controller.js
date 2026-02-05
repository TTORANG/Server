import {
  recordPageView,
  recordSlideView,
  recordVideoEvent,
  recordExit,
  getSummary,
  getSlideAnalytics,
  getVideoTimeline,
  getVideoExits,
  getRecentComments,
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsRecordResponse'
 *       400:
 *         description: 잘못된 요청 파라미터
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsError400'
 *       401:
 *         description: 세션 정보 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsError401'
 *       404:
 *         description: 프로젝트를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsError404Project'
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsRecordResponse'
 *       400:
 *         description: 잘못된 요청 파라미터
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsError400'
 *       401:
 *         description: 세션 정보 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsError401'
 *       404:
 *         description: 슬라이드를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsError404Slide'
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsRecordResponse'
 *       400:
 *         description: 잘못된 요청 파라미터
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsError400'
 *       401:
 *         description: 세션 정보 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsError401'
 *       404:
 *         description: 영상을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsError404Video'
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsRecordResponse'
 *       400:
 *         description: 잘못된 요청 파라미터
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsError400'
 *       401:
 *         description: 세션 정보 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsError401'
 *       404:
 *         description: 프로젝트를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsError404Project'
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
 *       400:
 *         description: 잘못된 요청 파라미터
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsError400'
 *       404:
 *         description: 프로젝트를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsError404Project'
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
 *       400:
 *         description: 잘못된 요청 파라미터
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsError400'
 *       404:
 *         description: 프로젝트를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsError404Project'
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
 *       400:
 *         description: 잘못된 요청 파라미터
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsError400'
 *       404:
 *         description: 영상을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsError404Video'
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
 *       400:
 *         description: 잘못된 요청 파라미터
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsError400'
 *       404:
 *         description: 영상을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsError404Video'
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
 * /presentations/{projectId}/analytics/recent-comments:
 *   get:
 *     summary: 최근 댓글 피드백 조회
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
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 50
 *         description: 조회할 댓글 수 (최대 50)
 *     responses:
 *       200:
 *         description: 최근 댓글 피드백 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecentCommentsResponse'
 *       400:
 *         description: 잘못된 요청 파라미터
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsError400'
 *       401:
 *         description: 세션 정보 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsError401'
 *       404:
 *         description: 프로젝트를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsError404Project'
 */
export const handleGetRecentComments = async (req, res, next) => {
  try {
    const result = await getRecentComments({
      projectId: req.params.projectId,
      limit: req.query.limit,
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
 *     AnalyticsRecordResponse:
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
 *             ok:
 *               type: boolean
 *               example: true
 *
 *     AnalyticsErrorResponse:
 *       type: object
 *       description: 에러 응답 공통 형식
 *       properties:
 *         resultType:
 *           type: string
 *           example: FAIL
 *         error:
 *           type: object
 *           properties:
 *             errorCode:
 *               type: string
 *               description: "에러 코드 (AN001: 프로젝트 없음, AN002: 영상 없음, AN003: 슬라이드 없음, AN004: 잘못된 파라미터, AN005: 세션 필요)"
 *             reason:
 *               type: string
 *               description: 에러 메시지
 *             data:
 *               type: object
 *               nullable: true
 *               description: 추가 에러 정보
 *         success:
 *           nullable: true
 *
 *     AnalyticsError400:
 *       type: object
 *       properties:
 *         resultType:
 *           type: string
 *           example: FAIL
 *         error:
 *           type: object
 *           properties:
 *             errorCode:
 *               type: string
 *               example: AN004
 *             reason:
 *               type: string
 *               example: 프로젝트 ID가 올바르지 않습니다.
 *             data:
 *               type: object
 *               nullable: true
 *         success:
 *           nullable: true
 *
 *     AnalyticsError401:
 *       type: object
 *       properties:
 *         resultType:
 *           type: string
 *           example: FAIL
 *         error:
 *           type: object
 *           properties:
 *             errorCode:
 *               type: string
 *               example: AN005
 *             reason:
 *               type: string
 *               example: 세션 정보가 필요합니다.
 *             data:
 *               type: object
 *               nullable: true
 *         success:
 *           nullable: true
 *
 *     AnalyticsError404Project:
 *       type: object
 *       properties:
 *         resultType:
 *           type: string
 *           example: FAIL
 *         error:
 *           type: object
 *           properties:
 *             errorCode:
 *               type: string
 *               example: AN001
 *             reason:
 *               type: string
 *               example: 프로젝트를 찾을 수 없습니다.
 *             data:
 *               type: object
 *               nullable: true
 *         success:
 *           nullable: true
 *
 *     AnalyticsError404Slide:
 *       type: object
 *       properties:
 *         resultType:
 *           type: string
 *           example: FAIL
 *         error:
 *           type: object
 *           properties:
 *             errorCode:
 *               type: string
 *               example: AN003
 *             reason:
 *               type: string
 *               example: 슬라이드를 찾을 수 없습니다.
 *             data:
 *               type: object
 *               nullable: true
 *         success:
 *           nullable: true
 *
 *     AnalyticsError404Video:
 *       type: object
 *       properties:
 *         resultType:
 *           type: string
 *           example: FAIL
 *         error:
 *           type: object
 *           properties:
 *             errorCode:
 *               type: string
 *               example: AN002
 *             reason:
 *               type: string
 *               example: 영상을 찾을 수 없습니다.
 *             data:
 *               type: object
 *               nullable: true
 *         success:
 *           nullable: true
 *
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
 *             videoIds:
 *               type: array
 *               items:
 *                 type: string
 *               description: 프로젝트에 연결된 비디오 ID 목록
 *               example:
 *                 - "1"
 *                 - "2"
 *                 - "3"
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
 *
 *     RecentCommentsResponse:
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
 *             comments:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   commentId:
 *                     type: string
 *                     description: 댓글 ID
 *                   content:
 *                     type: string
 *                     description: 댓글 내용
 *                   timestampMs:
 *                     type: integer
 *                     description: 영상 내 타임스탬프 (ms)
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                     description: 댓글 작성 시간
 *                   user:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: string
 *                         description: 사용자 ID
 *                       nickName:
 *                         type: string
 *                         description: 사용자 닉네임
 *                       name:
 *                         type: string
 *                         description: 사용자 이름
 *                   slide:
 *                     type: object
 *                     nullable: true
 *                     description: 해당 타임스탬프의 슬라이드 정보
 *                     properties:
 *                       slideId:
 *                         type: string
 *                         description: 슬라이드 ID
 *                       slideNum:
 *                         type: integer
 *                         nullable: true
 *                         description: 슬라이드 번호
 *                       title:
 *                         type: string
 *                         nullable: true
 *                         description: 슬라이드 제목
 *                       imageUrl:
 *                         type: string
 *                         nullable: true
 *                         description: 슬라이드 이미지 URL
 */
