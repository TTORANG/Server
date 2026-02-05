import {
  commentListResponseDTO,
  commentResponseDTO,
  createSlideCommentRequestDTO,
  videoCommentResponseDTO,
  videoCommentListResponseDTO,
} from "../dtos/comment.dto.js";
import {
  createSlideComment,
  createVideoComment,
  deleteComment,
  getSlideComments,
  getVideoCommentsByTimestamp,
  updateComment,
} from "../services/comment.service.js";

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
   *       403:
   *         description: 댓글 작성 권한 없음 (프로젝트 소유자 아님)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               noPermission:
   *                 value:
   *                   resultType: FAILURE
   *                   error:
   *                     errorCode: C006
   *                     reason: 댓글을 수정 또는 삭제할 권한이 없습니다.
   *                     data: null
   *                   success: null
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
   *       500:
   *         description: 서버 내부 오류
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
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

// 댓글 수정
export const patchComment = async (req, res, next) => {
  /**
   * @swagger
   * /comments/{commentId}:
   *   patch:
   *     summary: 댓글 수정
   *     description: |
   *       작성한 댓글의 내용을 수정합니다.
   *
   *       - 본인 댓글만 수정할 수 있습니다.
   *       - 공백/빈 문자열은 허용하지 않습니다.
   *     tags: [Comment]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: commentId
   *         required: true
   *         description: 댓글 ID
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: "#/components/schemas/UpdateCommentRequest"
   *           examples:
   *             basic:
   *               summary: 댓글 수정 요청
   *               value:
   *                 content: "수정된 댓글 내용입니다."
   *     responses:
   *       200:
   *         description: 댓글 수정 성공
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/UpdateCommentResponse"
   *       400:
   *         description: 잘못된 요청(댓글 ID/내용 오류)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               invalidCommentId:
   *                 value:
   *                   resultType: FAILURE
   *                   error:
   *                     errorCode: C004
   *                     reason: 유효하지 않은 댓글 ID입니다.
   *                     data:
   *                       commentId: "abc"
   *                   success: null
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
   *       403:
   *         description: 수정 권한 없음
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               noPermission:
   *                 value:
   *                   resultType: FAILURE
   *                   error:
   *                     errorCode: C006
   *                     reason: 댓글을 수정 또는 삭제할 권한이 없습니다.
   *                     data: null
   *                   success: null
   *       404:
   *         description: 댓글 없음
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               commentNotFound:
   *                 value:
   *                   resultType: FAILURE
   *                   error:
   *                     errorCode: C005
   *                     reason: 댓글을 찾을 수 없습니다.
   *                     data:
   *                       commentId: "10"
   *                   success: null
   *       500:
   *         description: 서버 내부 오류
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   */
  try {
    const commentId = BigInt(req.params.commentId);
    const content = req.body.content?.trim();

    const updated = await updateComment({
      commentId,
      content,
      userId: req.user.id,
    });

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: commentResponseDTO(updated),
    });
  } catch (e) {
    next(e);
  }
};

// 댓글 삭제
export const deleteCommentController = async (req, res, next) => {
  /**
   * @swagger
   * /comments/{commentId}:
   *   delete:
   *     summary: 댓글 및 답글 삭제
   *     description: |
   *       작성한 댓글과 답글을 삭제합니다. (Soft Delete)
   *
   *       - 본인 댓글만 삭제할 수 있습니다.
   *       - 삭제 시 실제 row 삭제가 아니라 `isDeleted=true`로 처리됩니다.
   *     tags: [Comment]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: commentId
   *         required: true
   *         description: 댓글(답글) ID
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: 댓글 삭제 성공
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/DeleteCommentResponse"
   *       400:
   *         description: 잘못된 요청(댓글 ID 오류)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               invalidCommentId:
   *                 value:
   *                   resultType: FAILURE
   *                   error:
   *                     errorCode: C004
   *                     reason: 유효하지 않은 댓글 ID입니다.
   *                     data:
   *                       commentId: "abc"
   *                   success: null
   *       401:
   *         description: 인증 실패
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *       403:
   *         description: 삭제 권한 없음
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               noPermission:
   *                 value:
   *                   resultType: FAILURE
   *                   error:
   *                     errorCode: C006
   *                     reason: 댓글을 수정 또는 삭제할 권한이 없습니다.
   *                     data: null
   *                   success: null
   *       404:
   *         description: 댓글 없음
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               commentNotFound:
   *                 value:
   *                   resultType: FAILURE
   *                   error:
   *                     errorCode: C005
   *                     reason: 댓글을 찾을 수 없습니다.
   *                     data:
   *                       commentId: "10"
   *                   success: null
   *       500:
   *         description: 서버 내부 오류
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   */

  try {
    const commentId = BigInt(req.params.commentId);

    await deleteComment({
      commentId,
      userId: req.user.id,
    });

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: null,
    });
  } catch (e) {
    next(e);
  }
};

// 댓글 목록 조회
export const getSlideCommentsController = async (req, res, next) => {
  /**
   * @swagger
   * /slides/{slideId}/comments:
   *   get:
   *     summary: 슬라이드 댓글 목록 조회
   *     description: |
   *       특정 슬라이드에 작성된 모든 댓글을 조회합니다.
   *
   *       - 작성 시간 기준 오름차순 정렬
   *       - Soft delete된 댓글은 제외됩니다.
   *       - 페이지네이션을 지원합니다.
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
   *       - in: query
   *         name: page
   *         required: false
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         required: false
   *         schema:
   *           type: integer
   *           default: 20
   *     responses:
   *       200:
   *         description: 댓글 목록 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/CommentListResponse"
   *       400:
   *         description: 잘못된 슬라이드 ID
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               invalidSlideId:
   *                 value:
   *                   resultType: FAILURE
   *                   error:
   *                     errorCode: C003
   *                     reason: 유효하지 않은 슬라이드 ID입니다.
   *                     data:
   *                       slideId: "abc"
   *                   success: null
   *       403:
   *         description: 조회 권한 없음 (프로젝트 소유자 아님)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               noPermission:
   *                 value:
   *                   resultType: FAILURE
   *                   error:
   *                     errorCode: C006
   *                     reason: 댓글을 수정 또는 삭제할 권한이 없습니다.
   *                     data: null
   *                   success: null
   *       500:
   *         description: 댓글 조회 실패
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               listFetchFailed:
   *                 value:
   *                   resultType: FAILURE
   *                   error:
   *                     errorCode: C007
   *                     reason: 댓글을 불러올 수 없습니다.
   *                     data:
   *                       slideId: "5"
   *                   success: null
   */

  try {
    const slideId = BigInt(req.params.slideId);
    const { page, limit } = req.query;

    const result = await getSlideComments({
      slideId,
      userId: req.user.id,
      page,
      limit,
    });

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: commentListResponseDTO(result),
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
   *       - 본 API는 인증(JWT)이 필요합니다.
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
   *       201:
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
   *         description: 인증 실패 (JWT 누락/만료)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
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
   *       500:
   *         description: 서버 내부 오류
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   */

  try {
    const { videoId } = req.params;
    const { content, timestampMs } = req.body;

    const comment = await createVideoComment({
      videoId,
      content,
      timestampMs,
      userId: req.user.id,
    });

    res.status(201).json({
      resultType: "SUCCESS",
      error: null,
      success: videoCommentResponseDTO(comment),
    });
  } catch (e) {
    next(e);
  }
}

// 시간대별 댓글 조회
export const getVideoCommentsByTimestampController = async (req, res, next) => {
  /**
   * @swagger
   * /videos/{videoId}/comments:
   *   get:
   *     summary: 영상 시간대별 댓글 조회
   *     description: |
   *       특정 영상의 특정 시간대(기본 10초 구간)에 작성된 댓글만 조회합니다.
   *
   *       - timestamp(ms) 기준 10초 window 필터링
   *       - Soft delete된 댓글 제외
   *       - 프로젝트 소유자만 조회 가능
   *
   *     tags: [Comment]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: videoId
   *         required: true
   *         schema:
   *           type: integer
   *         description: 영상 ID
   *       - in: query
   *         name: timestamp
   *         required: true
   *         schema:
   *           type: integer
   *           minimum: 0
   *           example: 20000
   *         description: |
   *           현재 재생 시점(ms).
   *           예) 20000 → 20000~29999ms 댓글 조회
   *
   *     responses:
   *       200:
   *         description: 시간대별 댓글 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/VideoCommentListResponse"
   *
   *       400:
   *         description: 잘못된 요청 (timestamp 형식 오류 등)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               invalidTimestamp:
   *                 summary: timestampMs 형식 오류
   *                 value:
   *                   resultType: FAILURE
   *                   error:
   *                     errorCode: P001
   *                     reason: "timestampMs 오류"
   *                     data:
   *                       timestampMs: "-100"
   *                   success: null
   *
   *       401:
   *         description: 인증 실패 (JWT 누락/만료)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               unauthorized:
   *                 value:
   *                   resultType: FAILURE
   *                   error:
   *                     errorCode: A004
   *                     reason: "인증 세션 정보가 없거나 유효하지 않습니다."
   *                     data: null
   *                   success: null
   *
   *       403:
   *         description: 조회 권한 없음 (프로젝트 소유자 아님)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               noPermission:
   *                 value:
   *                   resultType: FAILURE
   *                   error:
   *                     errorCode: C006
   *                     reason: "댓글을 수정 또는 삭제할 권한이 없습니다."
   *                     data: null
   *                   success: null
   *
   *       404:
   *         description: 영상 없음
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               videoNotFound:
   *                 value:
   *                   resultType: FAILURE
   *                   error:
   *                     errorCode: V001
   *                     reason: "영상을 찾을 수 없습니다."
   *                     data:
   *                       videoId: "9999"
   *                   success: null
   *
   *       500:
   *         description: 서버 내부 오류
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   */
  try {
    const { videoId } = req.params;
    const { timestamp } = req.query;

    const comments = await getVideoCommentsByTimestamp({
      videoId,
      timestampMs: timestamp,
      userId: req.user.id,
    });

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: videoCommentListResponseDTO(comments),
    });
  } catch (e) {
    next(e);
  }
};

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
 *         commentId:
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
 *     UpdateCommentRequest:
 *       type: object
 *       required:
 *         - content
 *       properties:
 *         content:
 *           type: string
 *           description: 수정할 댓글 내용(공백 불가)
 *           example: "수정된 댓글 내용입니다."
 *
 *     UpdateCommentResponse:
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
 *     DeleteCommentResponse:
 *       type: object
 *       properties:
 *         resultType:
 *           type: string
 *           example: SUCCESS
 *         error:
 *           nullable: true
 *           example: null
 *         success:
 *           nullable: true
 *           example: null
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
 *               example: C005
 *             reason:
 *               type: string
 *               example: 댓글을 찾을 수 없습니다.
 *             data:
 *               nullable: true
 *               example:
 *                 commentId: "10"
 *         success:
 *           nullable: true
 *           example: null
 *
 *     CommentListItem:
 *       type: object
 *       properties:
 *         commentId:
 *           type: string
 *           example: "10"
 *         content:
 *           type: string
 *           example: "이 슬라이드 이해하기 쉬워요"
 *         user:
 *           type: object
 *           properties:
 *             userId:
 *               type: string
 *               example: "3"
 *             nickName:
 *               type: string
 *               example: "조이"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *
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
 *           type: object
 *           properties:
 *             comments:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/CommentListItem"
 *             pagination:
 *               type: object
 *               properties:
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 20
 *                 total:
 *                   type: integer
 *                   example: 53
 *                 totalPages:
 *                   type: integer
 *                   example: 3
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
 *
 *     VideoCommentListItem:
 *       type: object
 *       properties:
 *         commentId:
 *           type: string
 *           example: "15"
 *         content:
 *           type: string
 *           example: "여기 설명 좋아요"
 *         timestampMs:
 *           type: integer
 *           example: 20000
 *         user:
 *           type: object
 *           properties:
 *             userId:
 *               type: string
 *               example: "3"
 *             nickName:
 *               type: string
 *               example: "조이"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2026-02-02T05:20:00.000Z
 *
 *     VideoCommentListResponse:
 *       type: object
 *       properties:
 *         resultType:
 *           type: string
 *           example: SUCCESS
 *         error:
 *           nullable: true
 *           example: null
 *         success:
 *           type: object
 *           properties:
 *             comments:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/VideoCommentListItem"
 */
