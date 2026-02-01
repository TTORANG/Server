import { createVideoComment } from "../services/comment.service.js";

// 영상 타임스탬프 댓글 생성
export async function handleCreateVideoComment(req, res, next) {
  /**
   * @swagger
   * /videos/{videoId}/comments:
   *   post:
   *     summary: 영상 타임스탬프 댓글 생성
   *     description: |
   *       특정 영상의 특정 시점(timestampMs)에 댓글을 생성합니다.
   *
   *       **주의사항**
   *       - 본 API는 인증(JWT) + 세션(sessionId)이 필요합니다.
   *       - `content`는 공백만 있는 문자열은 허용하지 않습니다.
   *       - `timestampMs`는 0 이상의 정수(ms)만 허용합니다.
   *     tags: [Video]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: videoId
   *         required: true
   *         schema:
   *           type: integer
   *           example: 2
   *         description: 영상 ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: "#/components/schemas/VideoCommentCreateRequest"
   *           examples:
   *             commentAt2s:
   *               summary: 2초 지점 댓글 생성
   *               value:
   *                 content: "여기 설명 좋아요"
   *                 timestampMs: 2000
   *     responses:
   *       200:
   *         description: 댓글 생성 성공
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/VideoCommentCreateResponse"
   *             examples:
   *               created:
   *                 value:
   *                   resultType: "SUCCESS"
   *                   error: null
   *                   success:
   *                     id: "15"
   *                     content: "여기 설명 좋아요"
   *                     timestampMs: 2000
   *                     createdAt: "2026-01-24T12:34:56.000Z"
   *       400:
   *         description: 잘못된 입력(content/timestampMs 형식 오류 등)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               emptyContent:
   *                 value:
   *                   resultType: "FAILURE"
   *                   error:
   *                     errorCode: "P001"
   *                     reason: "댓글 내용은 비워둘 수 없습니다."
   *                     data:
   *                       content: ""
   *                   success: null
   *       401:
   *         description: 인증/세션 정보 누락
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               noSession:
   *                 value:
   *                   resultType: "FAILURE"
   *                   error:
   *                     errorCode: "A004"
   *                     reason: "인증 세션 정보가 없습니다."
   *                     data:
   *                       userId: "1"
   *                       videoId: "2"
   *                   success: null
   *       404:
   *         description: 영상 없음
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               notFound:
   *                 value:
   *                   resultType: "FAILURE"
   *                   error:
   *                     errorCode: "V001"
   *                     reason: "영상을 찾을 수 없습니다."
   *                     data:
   *                       videoId: "9999"
   *                   success: null
   */

  try {
    const { id: videoId } = req.params;
    const { content, timestampMs } = req.body;

    const result = await createVideoComment({
      videoId,
      content,
      timestampMs,
      userId: req.user.id,
      sessionId: req.user.sessionId,
    });

    res.json(result);
  } catch (e) {
    next(e);
  }
}

/**
 * @swagger
 * components:
 *   schemas:
 *
 *     RecordingStartResponse:
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
 *             videoId:
 *               type: string
 *               description: 생성된 영상 ID(BigInt → string)
 *               example: "12"
 *
 *     VideoChunkUploadResponse:
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
 *     RecordingFinishRequest:
 *       type: object
 *       required:
 *         - slideLogs
 *       properties:
 *         slideLogs:
 *           type: array
 *           description: 녹화 중 발생한 슬라이드 전환 로그
 *           items:
 *             type: object
 *             required:
 *               - slideId
 *               - timestampMs
 *             properties:
 *               slideId:
 *                 type: integer
 *                 description: 슬라이드 ID
 *                 example: "1"
 *               timestampMs:
 *                 type: integer
 *                 description: 슬라이드 전환 시점(ms)
 *                 example: 15000
 *
 *     RecordingFinishResponse:
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
 *             videoId:
 *               type: string
 *               description: 영상 ID(BigInt → string)
 *               example: "12"
 *             status:
 *               type: string
 *               enum: [processing]
 *               example: processing
 *             slideCount:
 *               type: integer
 *               example: 3
 *             slideDurations:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   slideId:
 *                     type: string
 *                     example: "1"
 *                   totalDurationMs:
 *                     type: integer
 *                     example: 12000
 *
 *     VideoListItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: 영상 ID(BigInt → string)
 *           example: "10"
 *         title:
 *           type: string
 *           nullable: true
 *           example: 발표 영상 1
 *         status:
 *           type: string
 *           enum: [recording, uploading, processing, ready, failed]
 *           example: ready
 *         durationSeconds:
 *           type: integer
 *           nullable: true
 *           example: 120
 *         thumbnailUrl:
 *           type: string
 *           nullable: true
 *           example: https://example.com/thumb.jpg
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     VideoListResponse:
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
 *             videos:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/VideoListItem"
 *
 *     VideoDetailResponse:
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
 *             video:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: "2"
 *                 title:
 *                   type: string
 *                   nullable: true
 *                 status:
 *                   type: string
 *                   example: ready
 *                 durationSeconds:
 *                   type: integer
 *                   nullable: true
 *                 width:
 *                   type: integer
 *                   nullable: true
 *                 height:
 *                   type: integer
 *                   nullable: true
 *                 fps:
 *                   type: number
 *                   nullable: true
 *                 hlsMasterUrl:
 *                   type: string
 *                   nullable: true
 *                 thumbnailUrl:
 *                   type: string
 *                   nullable: true
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *             timeline:
 *               type: object
 *               nullable: true
 *               properties:
 *                 reactions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       timestampMs:
 *                         type: integer
 *                       emojiType:
 *                         type: string
 *                       count:
 *                         type: integer
 *                 comments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       timestampMs:
 *                         type: integer
 *                       content:
 *                         type: string
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *
 */
