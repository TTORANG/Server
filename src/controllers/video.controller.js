import * as videoService from "../services/video.service.js";

export async function createVideo(req, res, next) {
  /**
   * @swagger
   * /videos:
   *   post:
   *     summary: 영상 녹화 세션 생성
   *     description: |
   *       웹캠 녹화를 시작하기 위한 영상 세션을 생성합니다.
   *       반환된 videoId는 이후 청크 업로드 및 인코딩 완료 처리에 사용됩니다.
   *     tags: [Video]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           example:
   *             projectId: 2
   *             title: "테스트 영상"
   *     responses:
   *       200:
   *         description: 영상 생성 성공
   *         content:
   *           application/json:
   *             example:
   *               resultType: "SUCCESS"
   *               error: null
   *               success:
   *                 videoId: "4"
   *       400:
   *         description: 잘못된 요청
   *         content:
   *           application/json:
   *             example:
   *               resultType: "FAILURE"
   *               error:
   *                 errorCode: "F001"
   *                 reason: "프로젝트 ID가 올바르지 않습니다."
   *               success: null
   */
  try {
    const result = await videoService.createVideo(req.body);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

// Video Chunk 업로드 API
export async function createVideoChunkUploadUrl(req, res, next) {
  /**
   * @swagger
   * /videos/{videoId}/chunks/upload-url:
   *   post:
   *     summary: 영상 청크 업로드 URL 발급
   *     description: |
   *       영상 녹화 중 생성된 청크(WebM)를 업로드하기 위한
   *       Google Cloud Storage Signed URL을 발급합니다.
   *
   *       ⚠️ 중요
   *       - 이 API는 **업로드 URL만 발급**합니다.
   *       - 실제 파일 업로드는 **백엔드를 거치지 않고**
   *         **반환된 uploadUrl로 직접 PUT 요청**해야 합니다.
   *       - Content-Type은 반드시 `video/webm` 이어야 합니다.
   *     tags: [Video]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: videoId
   *         required: true
   *         schema:
   *           type: integer
   *           example: 4
   *         description: 영상 ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           example:
   *             projectId: 2
   *             chunkIndex: 0
   *             size: 1048576
   *             contentType: "video/webm"
   *     responses:
   *       200:
   *         description: 업로드 URL 발급 성공
   *         content:
   *           application/json:
   *             example:
   *               resultType: "SUCCESS"
   *               error: null
   *               success:
   *                 objectKey: "dev/project/2/video/4/chunks/0/uuid.webm"
   *                 uploadUrl: "https://storage.googleapis.com/..."
   *                 expiresAt: "2026-01-18T21:03:15.164Z"
   *       400:
   *         description: 잘못된 요청
   *         content:
   *           application/json:
   *             example:
   *               resultType: "FAILURE"
   *               error:
   *                 errorCode: "V003"
   *                 reason: "영상 청크는 webm 형식만 업로드할 수 있습니다."
   *               success: null
   */
  try {
    const result = await videoService.createVideoChunkUploadUrl({
      videoId: req.params.videoId,
      ...req.body,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

// chunk complete API
export async function completeVideoChunk(req, res, next) {
  /**
   * @swagger
   * /videos/{videoId}/chunks/complete:
   *   post:
   *     summary: 영상 청크 업로드 완료 처리
   *     description: |
   *       GCS에 업로드된 영상 청크를 검증하고
   *       서버에 청크 정보를 기록합니다.
   *
   *       - 반드시 **PUT 업로드 성공 후** 호출해야 합니다.
   *     tags: [Video]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: videoId
   *         required: true
   *         schema:
   *           type: integer
   *           example: 4
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           example:
   *             projectId: 2
   *             chunkIndex: 0
   *             objectKey: "dev/project/2/video/4/chunks/0/uuid.webm"
   *     responses:
   *       200:
   *         description: 청크 처리 성공
   *         content:
   *           application/json:
   *             example:
   *               resultType: "SUCCESS"
   *               error: null
   *               success:
   *                 ok: true
   */
  try {
    const result = await videoService.completeVideoChunk({
      videoId: req.params.videoId,
      ...req.body,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

// 업로드 완료 → 인코딩 Job 생성
export async function completeVideoUpload(req, res, next) {
  /**
   * @swagger
   * /videos/{videoId}/complete:
   *   post:
   *     summary: 영상 업로드 완료 및 인코딩 시작
   *     description: |
   *       모든 영상 청크 업로드가 완료된 후 호출합니다.
   *
   *       서버는 다음 작업을 수행합니다:
   *       - 영상 상태를 `processing`으로 변경
   *       - 인코딩 작업(Job)을 생성하고 큐에 등록
   *
   *       ⚠️ 주의
   *       - 이 API는 **uploading 상태에서 한 번만 호출**해야 합니다.
   *       - 이미 processing / ready 상태이면 오류가 발생합니다.
   *     tags: [Video]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: videoId
   *         required: true
   *         schema:
   *           type: integer
   *           example: 4
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           example:
   *             projectId: 2
   *     responses:
   *       200:
   *         description: 인코딩 시작 성공
   *         content:
   *           application/json:
   *             example:
   *               resultType: "SUCCESS"
   *               error: null
   *               success:
   *                 ok: true
   *       400:
   *         description: 잘못된 상태
   *         content:
   *           application/json:
   *             example:
   *               resultType: "FAILURE"
   *               error:
   *                 errorCode: "V002"
   *                 reason: "영상 상태가 올바르지 않습니다."
   *               success: null
   */
  try {
    const result = await videoService.completeVideoUpload({
      videoId: req.params.videoId,
      projectId: req.body.projectId,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

// 프로젝트 영상 목록 조회
export async function handleGetVideoList(req, res, next) {
  /**
   * @swagger
   * /videos/{projectId}:
   *   get:
   *     summary: 프로젝트 내 영상 목록 조회
   *     description: |
   *       특정 프로젝트에 속한 영상 목록을 조회합니다.
   *
   *       **조회 조건**
   *       - 프로젝트는 존재해야 하며 삭제되지 않은 상태여야 합니다.
   *       - 영상은 삭제되지 않은 상태(`deletedAt = null`)만 조회됩니다.
   *
   *       **정렬 기준**
   *       - 생성일(`createdAt`) 기준 내림차순
   *
   *       **주의사항**
   *       - 본 API는 인증(JWT)이 필요합니다.
   *       - 반환되는 `id`는 BigInt이므로 문자열(string)로 변환되어 반환됩니다.
   *     tags: [Video]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: integer
   *           example: 2
   *         description: 프로젝트 ID
   *     responses:
   *       200:
   *         description: 영상 목록 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/VideoListResponse"
   *             examples:
   *               success:
   *                 value:
   *                   resultType: "SUCCESS"
   *                   error: null
   *                   success:
   *                     videos:
   *                       - id: "10"
   *                         title: "발표 영상 1"
   *                         status: "ready"
   *                         durationSeconds: 120
   *                         thumbnailUrl: "https://example.com/thumb.jpg"
   *                         createdAt: "2026-01-24T10:00:00.000Z"
   *       401:
   *         description: 인증 실패
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *       404:
   *         description: 프로젝트 없음
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   */

  try {
    const { id: projectId } = req.params;
    const result = await videoService.getVideoList({ projectId });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

// 영상 상세 조회
export async function handleGetVideoDetail(req, res, next) {
  /**
   * @swagger
   * /videos/{videoId}:
   *   get:
   *     summary: 영상 상세 조회 (타임라인 포함)
   *     description: |
   *       특정 영상의 상세 정보를 조회합니다.
   *
   *       **포함 정보**
   *       - 영상 메타데이터(해상도, fps, 썸네일, HLS URL 등)
   *       - 타임스탬프 리액션 집계 정보
   *       - 타임스탬프 댓글 목록
   *
   *       **리액션 정보**
   *       - 동일 timestampMs + emojiType 기준으로 count 집계
   *
   *       **댓글 정보**
   *       - timestampMs 오름차순 정렬
   *       - 작성자(user) 정보 포함
   *
   *       **주의사항**
   *       - 본 API는 인증(JWT)이 필요합니다.
   *       - 영상이 존재하지 않거나 삭제된 경우 404 반환
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
   *     responses:
   *       200:
   *         description: 영상 상세 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/VideoDetailResponse"
   *             examples:
   *               success:
   *                 value:
   *                   resultType: "SUCCESS"
   *                   error: null
   *                   success:
   *                     video:
   *                       id: "2"
   *                       title: "발표 영상"
   *                       status: "ready"
   *                       durationSeconds: 300
   *                       width: 1920
   *                       height: 1080
   *                       fps: 30
   *                       hlsMasterUrl: "https://example.com/master.m3u8"
   *                       thumbnailUrl: "https://example.com/thumb.jpg"
   *                       createdAt: "2026-01-24T09:00:00.000Z"
   *                     timeline:
   *                       reactions:
   *                         - timestampMs: 2000
   *                           emojiType: "thumbs_up"
   *                           count: 3
   *                       comments:
   *                         - id: "15"
   *                           timestampMs: 2000
   *                           content: "여기 설명 좋아요"
   *                           user:
   *                             id: "1"
   *                             name: "홍길동"
   *       401:
   *         description: 인증 실패
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
   */

  try {
    const { id: videoId } = req.params;
    const result = await videoService.getVideoDetail({ videoId });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

// 영상 타임스탬프 리액션 생성
export async function handleToggleVideoReaction(req, res, next) {
  /**
   * @swagger
   * /videos/{videoId}/reactions:
   *   post:
   *     summary: 영상 타임스탬프 리액션 생성/토글
   *     description: |
   *       특정 영상의 특정 시점(timestampMs)에 대해 이모지 리액션을 **생성 또는 토글(활성/비활성)** 합니다.
   *
   *       - 동일 사용자(userId) + 동일 세션(sessionId) + 동일 영상(videoId) + 동일 timestampMs + 동일 emojiType 조합이 이미 존재하면,
   *         `isDeleted`를 토글하여 활성/비활성 상태를 변경합니다.
   *       - 존재하지 않으면 새 리액션을 생성합니다.
   *
   *       **주의사항**
   *       - 본 API는 인증(JWT) + 세션(sessionId)이 필요합니다.
   *       - `timestampMs`는 0 이상의 정수(ms)만 허용합니다.
   *       - `emojiType`은 문자열이며, 서버/클라이언트에서 합의된 타입을 사용해야 합니다.
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
   *             $ref: "#/components/schemas/VideoReactionCreateRequest"
   *           examples:
   *             thumbsUpAt2s:
   *               summary: 2초 지점 thumbs_up 리액션
   *               value:
   *                 emojiType: "thumbs_up"
   *                 timestampMs: 2000
   *     responses:
   *       200:
   *         description: 토글 성공(활성/비활성 결과 반환)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/VideoReactionToggleResponse"
   *             examples:
   *               activated:
   *                 summary: 새로 생성되거나 활성화됨
   *                 value:
   *                   resultType: "SUCCESS"
   *                   error: null
   *                   success:
   *                     active: true
   *               deactivated:
   *                 summary: 기존 리액션 비활성화됨
   *                 value:
   *                   resultType: "SUCCESS"
   *                   error: null
   *                   success:
   *                     active: false
   *       400:
   *         description: 잘못된 입력(emojiType/timestampMs 형식 오류 등)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               invalidTimestamp:
   *                 value:
   *                   resultType: "FAILURE"
   *                   error:
   *                     errorCode: "P001"
   *                     reason: "타임스탬프는 0 이상의 정수여야 합니다."
   *                     data:
   *                       timestampMs: -1
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
    const { emojiType, timestampMs } = req.body;

    const result = await videoService.toggleVideoReaction({
      videoId,
      emojiType,
      timestampMs,
      userId: req.user.id,
      sessionId: req.user.sessionId,
    });

    res.json(result);
  } catch (e) {
    next(e);
  }
}

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

    const result = await videoService.createVideoComment({
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

// 영상-슬라이드 동기화 조회
export async function handleGetVideoSlideTimeline(req, res, next) {
  try {
    const { videoId } = req.params;

    const result = await videoService.getVideoSlideTimeline({
      videoId,
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
 *     VideoListItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: 영상 ID(BigInt → string)
 *           example: "10"
 *         title:
 *           type: string
 *           example: "발표 영상 1"
 *         status:
 *           type: string
 *           example: ready
 *         durationSeconds:
 *           type: integer
 *           nullable: true
 *           example: 120
 *         thumbnailUrl:
 *           type: string
 *           nullable: true
 *           example: "https://example.com/thumb.jpg"
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
 *                 status:
 *                   type: string
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
 *     VideoReactionCreateRequest:
 *       type: object
 *       required:
 *         - emojiType
 *         - timestampMs
 *       properties:
 *         emojiType:
 *           type: string
 *           description: 리액션 이모지 타입(클라이언트/서버 합의 값)
 *           example: "thumbs_up"
 *         timestampMs:
 *           type: integer
 *           minimum: 0
 *           description: 영상 내 타임스탬프(ms)
 *           example: 2000
 *
 *     VideoReactionToggleResponse:
 *       type: object
 *       properties:
 *         resultType:
 *           type: string
 *           example: "SUCCESS"
 *         error:
 *           nullable: true
 *           example: null
 *         success:
 *           type: object
 *           properties:
 *             active:
 *               type: boolean
 *               description: 토글 결과 활성 여부(true=활성, false=비활성)
 *               example: true
 *
 *     VideoCommentCreateRequest:
 *       type: object
 *       required:
 *         - content
 *         - timestampMs
 *       properties:
 *         content:
 *           type: string
 *           description: 댓글 내용(공백만 있는 문자열 불가)
 *           example: "여기 설명 좋아요"
 *         timestampMs:
 *           type: integer
 *           minimum: 0
 *           description: 영상 내 타임스탬프(ms)
 *           example: 2000
 *
 *     VideoCommentCreateResponse:
 *       type: object
 *       properties:
 *         resultType:
 *           type: string
 *           example: "SUCCESS"
 *         error:
 *           nullable: true
 *           example: null
 *         success:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               description: 생성된 댓글 ID(BigInt → string)
 *               example: "15"
 *             content:
 *               type: string
 *               example: "여기 설명 좋아요"
 *             timestampMs:
 *               type: integer
 *               example: 2000
 *             createdAt:
 *               type: string
 *               format: date-time
 *               example: "2026-01-24T12:34:56.000Z"
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         resultType:
 *           type: string
 *           example: "FAILURE"
 *         error:
 *           type: object
 *           properties:
 *             errorCode:
 *               type: string
 *               example: "V001"
 *             reason:
 *               type: string
 *               example: "영상을 찾을 수 없습니다."
 *             data:
 *               nullable: true
 *               description: 디버깅용 부가 데이터(민감정보 금지)
 *               example:
 *                 videoId: "9999"
 *         success:
 *           nullable: true
 *           example: null
 */
