import * as videoService from "../services/video.service.js";

export async function createVideo(req, res, next) {
  /**
   * @swagger
   * /videos:
   *   post:
   *     summary: 비디오 녹화 세션 생성
   *     description: |
   *       웹캠 녹화를 시작하기 위한 비디오 세션을 생성합니다.
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
   *         description: 비디오 생성 성공
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
   *     summary: 비디오 청크 업로드 URL 발급
   *     description: |
   *       비디오 녹화 중 생성된 청크(WebM)를 업로드하기 위한
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
   *         description: 비디오 ID
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
   *                 reason: "비디오 청크는 webm 형식만 업로드할 수 있습니다."
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
   *     summary: 비디오 청크 업로드 완료 처리
   *     description: |
   *       GCS에 업로드된 비디오 청크를 검증하고
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
   *     summary: 비디오 업로드 완료 및 인코딩 시작
   *     description: |
   *       모든 비디오 청크 업로드가 완료된 후 호출합니다.
   *
   *       서버는 다음 작업을 수행합니다:
   *       - 비디오 상태를 `processing`으로 변경
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
   *                 reason: "비디오 상태가 올바르지 않습니다."
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
