import {
  commentResponseDTO,
  createCommentReplyRequestDTO,
  replyCreateResponseDTO,
} from "../dtos/comment.dto.js";
import { createCommentReply, getRepliesByParentId } from "../services/reply.service.js";

// 답글 작성
export const postCommentReply = async (req, res, next) => {
  /**
   * @swagger
   * /comments/{commentId}/replies:
   *   post:
   *     summary: 답글 작성
   *     description: |
   *       특정 댓글(comment)에 대한 답글을 작성합니다.
   *       - 답글은 parentId가 설정된 comment로 저장됩니다.
   *       - 작성자는 JWT 인증이 필요합니다.
   *
   *       성공 시 실시간 이벤트가 발행됩니다.
   *       - Socket Event: `new-comment`
   *       - Payload: `{ commentId, projectId, userId, content, createdAt, parentCommentId, slideId?, videoId? }`
   *       - `slideId` 또는 `videoId`는 부모 댓글의 targetType/targetId를 기준으로 포함됩니다.
   *     tags: [Comment]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: commentId
   *         required: true
   *         schema:
   *           type: integer
   *         description: 부모 댓글 ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: "#/components/schemas/CreateCommentReplyRequest"
   *     responses:
   *       201:
   *         description: 답글 생성 성공
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ReplyCreateResponse"
   *             examples:
   *               created:
   *                 value:
   *                   resultType: SUCCESS
   *                   error: null
   *                   success:
   *                     parentCommentId: "12"
   *                     replyId: "34"
   *                     content: "이 부분에 공감해요!"
   *                     userId: "3"
   *                     createdAt: "2026-02-07T10:20:30.000Z"
   *       400:
   *         description: 잘못된 요청
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *       401:
   *         description: 인증 실패
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *       404:
   *         description: 부모 댓글 없음
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *       500:
   *         description: 서버 내부 오류
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   */

  try {
    const parentCommentId = BigInt(req.params.commentId);
    const { content } = createCommentReplyRequestDTO(req.body);

    const reply = await createCommentReply({
      parentCommentId,
      content,
      userId: req.user.id,
    });

    res.status(201).json({
      resultType: "SUCCESS",
      error: null,
      success: replyCreateResponseDTO(reply),
    });
  } catch (e) {
    next(e);
  }
};

// 답글 목록 조회
export const getCommentReplies = async (req, res, next) => {
  /**
   * @swagger
   * /comments/{commentId}/replies:
   *   get:
   *     summary: 답글 목록 조회
   *     description: |
   *       특정 댓글(comment)에 달린 답글 목록을 조회합니다.
   *       - 삭제된 답글은 제외됩니다.
   *       - 생성일 오름차순으로 반환됩니다.
   *     tags: [Comment]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: commentId
   *         required: true
   *         schema:
   *           type: integer
   *         description: 부모 댓글 ID
   *     responses:
   *       200:
   *         description: 답글 목록 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ReplyListResponse"
   *       400:
   *         description: 잘못된 요청
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *       404:
   *         description: 부모 댓글 없음
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *       500:
   *         description: 서버 내부 오류
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   */

  try {
    const parentCommentId = BigInt(req.params.commentId);

    const replies = await getRepliesByParentId(parentCommentId);

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: replies.map(commentResponseDTO),
    });
  } catch (e) {
    next(e);
  }
};

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateCommentReplyRequest:
 *       type: object
 *       required:
 *         - content
 *       properties:
 *         content:
 *           type: string
 *           example: "이 부분에 공감해요!"
 *
 *     ReplyListItem:
 *       type: object
 *       properties:
 *         commentId:
 *           type: string
 *           example: "12"
 *         content:
 *           type: string
 *           example: "좋은 의견 감사합니다"
 *         userId:
 *           type: string
 *           example: "3"
 *         createdAt:
 *           type: string
 *           format: date-time

 *     ReplyCreateSuccess:
 *       type: object
 *       properties:
 *         parentCommentId:
 *           type: string
 *           description: 부모 댓글 ID(BigInt → string)
 *           example: "12"
 *         replyId:
 *           type: string
 *           description: 생성된 답글 ID(BigInt → string)
 *           example: "34"
 *         content:
 *           type: string
 *           example: "이 부분에 공감해요!"
 *         userId:
 *           type: string
 *           example: "3"
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     ReplyCreateResponse:
 *       type: object
 *       properties:
 *         resultType:
 *           type: string
 *           example: SUCCESS
 *         error:
 *           nullable: true
 *           example: null
 *         success:
 *           $ref: "#/components/schemas/ReplyCreateSuccess"

 *     ReplyListResponse:
 *       type: object
 *       properties:
 *         resultType:
 *           type: string
 *           example: SUCCESS
 *         error:
 *           nullable: true
 *           example: null
 *         success:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/ReplyListItem"
 */
