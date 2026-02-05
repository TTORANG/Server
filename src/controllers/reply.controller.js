import { commentResponseDTO, createCommentReplyRequestDTO } from "../dtos/comment.dto.js";
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
   *               $ref: "#/components/schemas/CommentCreateResponse"
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
      success: commentResponseDTO(reply),
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
   *               $ref: "#/components/schemas/CommentListResponse"
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
 *     CommentResponse:
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

 *     CommentCreateResponse:
 *       type: object
 *       properties:
 *         resultType:
 *           type: string
 *           example: SUCCESS
 *         error:
 *           nullable: true
 *           example: null
 *         success:
 *           $ref: "#/components/schemas/CommentResponse"

 *     CommentListResponse:
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
 *             $ref: "#/components/schemas/CommentResponse"
 *
 *     SuccessResponse:
 *       type: object
 *       properties:
 *         resultType:
 *           type: string
 *           example: SUCCESS
 *         error:
 *           type: null
 *         success:
 *           type: boolean
 *           example: true
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         resultType:
 *           type: string
 *           example: FAILURE
 *         error:
 *           type: object
 *           properties:
 *             errorCode:
 *               type: string
 *               example: C001
 *             reason:
 *               type: string
 *               example: 댓글을 찾을 수 없습니다.
 *             data:
 *               type: object
 *               nullable: true
 *         success:
 *           type: null
 */
