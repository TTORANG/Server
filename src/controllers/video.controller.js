import * as videoService from "../services/video.service.js";

export async function startRecording(req, res, next) {
  /**
   * @swagger
   * /videos/start:
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
   *             projectId: 1
   *             title: "테스트 영상"
   *     responses:
   *       200:
   *         description: 영상 생성 성공
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/RecordingStartResponse"
   *             example:
   *               resultType: "SUCCESS"
   *               error: null
   *               success:
   *                 videoId: "4"
   */
  try {
    const result = await videoService.createVideo(req.body);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

// 영상 청크 업로드
export async function uploadVideoChunk(req, res, next) {
  /**
   * @swagger
   * /videos/{videoId}/chunks/{chunkIndex}:
   *   post:
   *     summary: 영상 청크 업로드
   *     description: |
   *       MediaRecorder로 생성된 영상 청크(webm)를 업로드합니다.
   *       - Content-Type: multipart/form-data
   *       - file 필드로 전송
   *     tags: [Video]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: videoId
   *         required: true
   *         schema:
   *           type: integer
   *           example: 12
   *       - in: path
   *         name: chunkIndex
   *         required: true
   *         schema:
   *           type: integer
   *           example: 0
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required: [file]
   *             properties:
   *               file:
   *                 type: string
   *                 format: binary
   *     responses:
   *       200:
   *         description: 청크 업로드 성공
   *         content:
   *           application/json:
   *             example:
   *               resultType: "SUCCESS"
   *               error: null
   *               success:
   *                 ok: true
   */

  try {
    const result = await videoService.uploadVideoChunk({
      videoId: req.params.videoId,
      chunkIndex: req.params.chunkIndex,
      file: req.file,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

// 영상 녹화 완료
export async function finishRecording(req, res, next) {
  /**
   * @swagger
   * /videos/{videoId}/finish:
   *   post:
   *     summary: 녹화 종료 및 영상 처리 시작
   *     description: |
   *       녹화를 종료하고 다음 작업을 수행합니다.
   *       - 슬라이드 전환 로그 저장
   *       - 업로드된 영상 청크 검증
   *       - 영상 상태를 processing으로 변경
   *       - 인코딩 Job 생성
   *
   *       ⚠️ 모든 영상 청크 업로드 완료 후 호출해야 합니다.
   *
   *        #### slideLogs 설명
   *        - 녹화 중 수집된 슬라이드 전환 로그입니다.
   *        - 각 항목은 슬라이드가 전환된 시점(timestampMs)을 의미합니다.
   *        - 예시:
   *          ```json
   *          {
   *             "slideLogs": []
   *          }
   *          ```
   *     tags: [Video]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: videoId
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [slideLogs]
   *             properties:
   *               slideLogs:
   *                 type: array
   *                 items:
   *                   type: object
   *                   required: [slideId, timestampMs]
   *                   properties:
   *                     slideId:
   *                       type: integer
   *                       example: 1
   *                     timestampMs:
   *                       type: integer
   *                       example: 15000
   *     responses:
   *       200:
   *         description: 녹화 종료 성공
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/RecordingFinishResponse"
   *       400:
   *         description: 잘못된 요청 파라미터
   *         content:
   *           application/json:
   *             example:
   *               resultType: "FAILURE"
   *               error:
   *                 errorCode: "P001"
   *                 reason: "slideLogs가 필요합니다."
   *               success: null
   *
   *       401:
   *         description: 인증 실패 또는 영상 소유자 아님
   *         content:
   *           application/json:
   *             example:
   *               resultType: "FAILURE"
   *               error:
   *                 errorCode: "A004"
   *                 reason: "인증 세션 정보가 없습니다."
   *               success: null
   *
   *       404:
   *         description: 영상 없음
   *         content:
   *           application/json:
   *             example:
   *               resultType: "FAILURE"
   *               error:
   *                 errorCode: "V001"
   *                 reason: "영상을 찾을 수 없습니다."
   *                 data:
   *                   videoId: "12"
   *               success: null
   *       409:
   *         description: 영상 상태 오류
   *         content:
   *           application/json:
   *             example:
   *               resultType: "FAILURE"
   *               error:
   *                 errorCode: "V002"
   *                 reason: "영상 상태가 올바르지 않습니다."
   *                 data:
   *                   videoId: "12"
   *                   status: "processing"
   *               success: null
   */

  try {
    const result = await videoService.finishRecording({
      videoId: req.params.videoId,
      slideLogs: req.body.slideLogs,
      userId: req.user.id,
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
   * /presentations/{projectId}/videos:
   *   get:
   *     summary: 프로젝트 녹화 영상 목록 조회
   *     description:
   *       특정 프로젝트에 속한 모든 녹화 영상을 최신순으로 조회합니다.
   *       영상이 없는 경우에도 오류가 아닌 빈 목록을 반환합니다.
   *     tags:
   *       - Presentation
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         description: 프로젝트 ID
   *         schema:
   *           type: string
   *           example: "1"
   *     responses:
   *       200:
   *         description: 영상 목록 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/VideoListResponse"
   *       400:
   *         description: 잘못된 요청 (유효하지 않은 프로젝트 ID)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *       404:
   *         description: 존재하지 않는 프로젝트
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   */

  try {
    const { projectId } = req.params;
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
    const { videoId } = req.params;
    const result = await videoService.getVideoDetail({ videoId });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

// 영상-슬라이드 동기화 조회
export async function handleGetVideoSlideTimeline(req, res, next) {
  /**
   * @swagger
   * /videos/{videoId}/slides:
   *   get:
   *     summary: 영상-슬라이드 동기화 타임라인 조회
   *     description: |
   *       영상 재생 시간에 따라 표시되어야 할 슬라이드 전환 타임라인을 조회합니다.
   *
   *       **동작 규칙**
   *       - 슬라이드 전환 이벤트(`VideoSlideEvent`) 중 `enter` 이벤트만 반환합니다.
   *       - `timestampMs` 오름차순으로 정렬됩니다.
   *       - 슬라이드 이벤트가 없는 경우 빈 배열(`[]`)을 반환합니다.
   *
   *       **주의사항**
   *       - `videoId`는 정수(BigInt) 형식이어야 합니다.
   *       - 영상이 존재하지 않거나 삭제된 경우 오류를 반환합니다.
   *
   *     tags: [Video]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: videoId
   *         required: true
   *         schema:
   *           type: integer
   *           example: 1
   *         description: 영상 ID
   *     responses:
   *       200:
   *         description: 슬라이드 동기화 타임라인 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/VideoSlideTimelineResponse"
   *             examples:
   *               withEvents:
   *                 summary: 슬라이드 전환 이벤트 있음
   *                 value:
   *                   resultType: "SUCCESS"
   *                   error: null
   *                   success:
   *                     slides:
   *                       - slideId: "1"
   *                         timestampMs: 0
   *                       - slideId: "2"
   *                         timestampMs: 15000
   *               noEvents:
   *                 summary: 슬라이드 전환 이벤트 없음
   *                 value:
   *                   resultType: "SUCCESS"
   *                   error: null
   *                   success:
   *                     slides: []
   *       400:
   *         description: 잘못된 videoId 파라미터
   *         content:
   *           application/json:
   *             example:
   *               resultType: "FAILURE"
   *               error:
   *                 errorCode: "P001"
   *                 reason: "videoId가 올바르지 않습니다."
   *                 data:
   *                   videoId: "abc"
   *               success: null
   *       401:
   *         description: 인증 실패
   *       404:
   *         description: 영상 없음
   *         content:
   *           application/json:
   *             example:
   *               resultType: "FAILURE"
   *               error:
   *                 errorCode: "V001"
   *                 reason: "영상을 찾을 수 없습니다."
   *                 data:
   *                   videoId: "999"
   *               success: null
   *       409:
   *         description: 영상 상태가 올바르지 않음
   *         content:
   *           application/json:
   *             example:
   *               resultType: "FAILURE"
   *               error:
   *                 errorCode: "V002"
   *                 reason: "비디오 상태가 올바르지 않습니다."
   *                 data:
   *                   videoId: "1"
   *                   status: "processing"
   *               success: null
   */
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
 *     VideoSlideTimelineItem:
 *       type: object
 *       properties:
 *         slideId:
 *           type: string
 *           description: 슬라이드 ID(BigInt → string)
 *           example: "1"
 *         timestampMs:
 *           type: integer
 *           example: 15000
 *
 *     VideoSlideTimelineResponse:
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
 *                 $ref: "#/components/schemas/VideoSlideTimelineItem"
 */
