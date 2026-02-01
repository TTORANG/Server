import { commentResponseDTO, createSlideCommentRequestDTO } from "../dtos/comment.dto.js";
import { createSlideComment, createVideoComment } from "../services/comment.service.js";

// 댓글 작성
export const postSlideComment = async (req, res, next) => {
  /**
   * @swagger
   * /slides/{slideId}/comments:
   *   post:
   *     summary: 슬라이드 댓글 작성
   *     description: |
   *       특정 슬라이드에 댓글을 작성합니다.
   *     tags: [Comment]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: slideId
   *         required: true
   *         schema:
   *           type: integer
   *         description: 슬라이드 ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: "#/components/schemas/CreateSlideCommentRequest"
   *           examples:
   *             basic:
   *               summary: 슬라이드 댓글 작성
   *               value:
   *                 content: "이 슬라이드 설명이 이해하기 쉬워요"
   *     responses:
   *       201:
   *         description: 댓글 생성 성공
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/CreateSlideCommentResponse"
   *       400:
   *         description: 잘못된 요청 (댓글 내용 없음)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               emptyContent:
   *                 value:
   *                   resultType: FAILURE
   *                   error:
   *                     errorCode: C001
   *                     reason: 댓글 내용을 입력해주세요.
   *                     data: null
   *                   success: null
   *       401:
   *         description: 인증 실패
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *       404:
   *         description: 슬라이드 없음
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               slideNotFound:
   *                 value:
   *                   resultType: FAILURE
   *                   error:
   *                     errorCode: C002
   *                     reason: 슬라이드를 찾을 수 없습니다.
   *                     data:
   *                       slideId: "5"
   *                   success: null
   */
  try {
    const slideId = BigInt(req.params.slideId);
    const { content } = createSlideCommentRequestDTO(req.body);

    const comment = await createSlideComment({
      slideId,
      content,
      userId: req.user.id,
    });

    res.status(201).json({
      resultType: "SUCCESS",
      error: null,
      success: commentResponseDTO(comment),
    });
  } catch (e) {
    next(e);
  }
};

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
   *     tags: [Comment]
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
 *     CreateSlideCommentRequest:
 *       type: object
 *       required:
 *         - content
 *       properties:
 *         content:
 *           type: string
 *           description: 댓글 내용
 *           example: 이 슬라이드 정말 좋아요
 *
 *     Comment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: 댓글 ID(BigInt → string)
 *           example: "20"
 *         content:
 *           type: string
 *           example: 이 부분 설명이 좋아요
 *         userId:
 *           type: string
 *           description: 작성자 ID
 *           example: "3"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2026-02-02T04:10:00.000Z
 *
 *     CreateSlideCommentResponse:
 *       type: object
 *       properties:
 *         resultType:
 *           type: string
 *           example: SUCCESS
 *         error:
 *           nullable: true
 *           example: null
 *         success:
 *           $ref: "#/components/schemas/Comment"
 *
 *     VideoCommentCreateRequest:
 *       type: object
 *       required:
 *         - content
 *         - timestampMs
 *       properties:
 *         content:
 *           type: string
 *           description: 댓글 내용 (공백 불가)
 *           example: 여기 설명 좋아요
 *         timestampMs:
 *           type: integer
 *           description: 댓글이 달린 영상 시점(ms)
 *           minimum: 0
 *           example: 2000
 *
 *     VideoComment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: 댓글 ID(BigInt → string)
 *           example: "15"
 *         content:
 *           type: string
 *           example: 여기 설명 좋아요
 *         timestampMs:
 *           type: integer
 *           example: 2000
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2026-01-24T12:34:56.000Z
 *
 *     VideoCommentCreateResponse:
 *       type: object
 *       properties:
 *         resultType:
 *           type: string
 *           example: SUCCESS
 *         error:
 *           nullable: true
 *           example: null
 *         success:
 *           $ref: "#/components/schemas/VideoComment"
 */
