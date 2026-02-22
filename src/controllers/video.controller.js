import * as videoService from "../services/video.service.js";

// 영상 녹화 세션 생성
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
   *           schema:
   *             type: object
   *             properties:
   *               projectId:
   *                 type: integer
   *                 description: 프로젝트 ID (선택)
   *                 example: 1
   *               title:
   *                 type: string
   *                 description: 영상 제목 (선택)
   *                 example: "테스트 영상"
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
   *       400:
   *         description: 잘못된 요청 파라미터 또는 존재하지 않는 프로젝트
   *         content:
   *           application/json:
   *             examples:
   *               invalidProjectId:
   *                 value:
   *                   resultType: "FAILURE"
   *                   error:
   *                     errorCode: "P001"
   *                     reason: "프로젝트 ID가 올바르지 않습니다."
   *                     data:
   *                       projectId: "abc"
   *                   success: null
   *               projectNotFound:
   *                 value:
   *                   resultType: "FAILURE"
   *                   error:
   *                     errorCode: "F001"
   *                     reason: "존재하지 않는 프로젝트입니다."
   *                     data:
   *                       projectId: 1
   *                   success: null
   *       401:
   *         description: 인증 실패
   *         content:
   *           application/json:
   *             example:
   *               resultType: "FAILURE"
   *               error:
   *                 errorCode: "A004"
   *                 reason: "인증 세션 정보가 없거나 유효하지 않습니다."
   *                 data: null
   *               success: null
   *       500:
   *         description: 서버 내부 오류
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   */
  try {
    const result = await videoService.createVideo({
      ...req.body,
      userId: req.user?.id,
    });
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
   *       MediaRecorder로 생성된 영상 청크(webm/mp4)를 업로드합니다.
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
   *       400:
   *         description: 잘못된 요청 (chunkIndex/파일 형식/업로드 형식 오류 등)
   *         content:
   *           application/json:
   *             examples:
   *               invalidChunkIndex:
   *                 value:
   *                   resultType: "FAILURE"
   *                   error:
   *                     errorCode: "V004"
   *                     reason: "비디오 청크 정보가 올바르지 않습니다."
   *                     data:
   *                       chunkIndex: -1
   *                   success: null
   *               invalidContentType:
   *                 value:
   *                   resultType: "FAILURE"
   *                   error:
   *                     errorCode: "V004"
   *                     reason: "비디오 청크 정보가 올바르지 않습니다."
   *                     data:
   *                       contentType: "image/png"
   *                   success: null
   *       401:
   *         description: 인증 실패
   *         content:
   *           application/json:
   *             example:
   *               resultType: "FAILURE"
   *               error:
   *                 errorCode: "A004"
   *                 reason: "인증 세션 정보가 없거나 유효하지 않습니다."
   *                 data: null
   *               success: null
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
   *                 reason: "비디오 상태가 올바르지 않습니다."
   *                 data:
   *                   videoId: "12"
   *                   status: "processing"
   *               success: null
   *       500:
   *         description: 서버 내부 오류
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
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
   *         description: 잘못된 요청 파라미터 또는 업로드 검증 실패
   *         content:
   *           application/json:
   *             examples:
   *               missingSlideLogs:
   *                 value:
   *                   resultType: "FAILURE"
   *                   error:
   *                     errorCode: "P001"
   *                     reason: "slideLogs가 필요합니다."
   *                   success: null
   *               invalidSlideId:
   *                 value:
   *                   resultType: "FAILURE"
   *                   error:
   *                     errorCode: "P001"
   *                     reason: "요청 파라미터가 올바르지 않습니다."
   *                     data:
   *                       slideId: "abc"
   *                   success: null
   *               noChunks:
   *                 value:
   *                   resultType: "FAILURE"
   *                   error:
   *                     errorCode: "V003"
   *                     reason: "업로드된 비디오 청크가 없습니다."
   *                     data:
   *                       videoId: "12"
   *                   success: null
   *
   *       401:
   *         description: 인증 실패 또는 영상 소유자 아님
   *         content:
   *           application/json:
   *             example:
   *               resultType: "FAILURE"
   *               error:
   *                 errorCode: "A004"
   *                 reason: "인증 세션 정보가 없거나 유효하지 않습니다."
   *                 data: null
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
   *       500:
   *         description: 서버 내부 오류
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
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
   *       특정 프로젝트에 속한 녹화 영상 목록을 조회합니다.
   *       정렬(sort), 길이 필터(filter), 제목 검색(search)을 지원합니다.
   *       영상이 없는 경우에도 오류가 아닌 빈 목록을 반환합니다.
   *       각 영상에는 일반 댓글 수(rootCommentCount), 답글 수(replyCount),
   *       리액션 수(reactionCount), 조회 수(viewCount)가 함께 포함됩니다.
   *     tags:
   *       - Video
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
   *       - in: query
   *         name: sort
   *         required: false
   *         description: |
   *           정렬 조건
   *           - recent: 최신순(기본값)
   *           - commentCount: 피드백 많은 순(feedbackCount 내림차순)
   *           - name: 가나다순(title 오름차순)
   *         schema:
   *           type: string
   *           enum: [recent, commentCount, name]
   *           default: recent
   *       - in: query
   *         name: filter
   *         required: false
   *         description: |
   *           길이 필터
   *           - all: 전체(기본값)
   *           - 3m: 3분 이하(durationSeconds <= 180)
   *           - 5m: 5분 이하(durationSeconds <= 300)
   *         schema:
   *           type: string
   *           enum: [all, 3m, 5m]
   *           default: all
   *       - in: query
   *         name: search
   *         required: false
   *         description: 영상 제목 검색어(부분 일치, 대소문자 구분 없음)
   *         schema:
   *           type: string
   *           example: "발표"
   *     responses:
   *       200:
   *         description: 영상 목록 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/VideoListResponse"
   *             example:
   *               resultType: "SUCCESS"
   *               error: null
   *               success:
   *                 videos:
   *                   - videoId: "10"
   *                     title: "발표 연습 1"
   *                     status: "ready"
   *                     durationSeconds: 120
   *                     rootCommentCount: 5
   *                     replyCount: 3
   *                     reactionCount: 12
   *                     viewCount: 8
   *                     thumbnailUrl: "https://example.com/thumb.jpg"
   *                     createdAt: "2026-02-01T09:00:00.000Z"
   *       400:
   *         description: 잘못된 요청 (projectId/sort/filter 파라미터 오류 또는 존재하지 않는 프로젝트)
   *         content:
   *           application/json:
   *             examples:
   *               invalidProjectId:
   *                 value:
   *                   resultType: "FAILURE"
   *                   error:
   *                     errorCode: "P001"
   *                     reason: "프로젝트 ID가 올바르지 않습니다."
   *                     data:
   *                       projectId: "abc"
   *                   success: null
   *               projectNotFound:
   *                 value:
   *                   resultType: "FAILURE"
   *                   error:
   *                     errorCode: "F001"
   *                     reason: "존재하지 않는 프로젝트입니다."
   *                     data:
   *                       projectId: 1
   *                   success: null
   *               invalidSort:
   *                 value:
   *                   resultType: "FAILURE"
   *                   error:
   *                     errorCode: "P001"
   *                     reason: "sort는 recent, commentCount, name 중 하나여야 합니다."
   *                     data:
   *                       sort: "latest"
   *                   success: null
   *               invalidFilter:
   *                 value:
   *                   resultType: "FAILURE"
   *                   error:
   *                     errorCode: "P001"
   *                     reason: "filter는 all, 3m, 5m 중 하나여야 합니다."
   *                     data:
   *                       filter: "10m"
   *                   success: null
   *       401:
   *         description: 인증 실패
   *         content:
   *           application/json:
   *             example:
   *               resultType: "FAILURE"
   *               error:
   *                 errorCode: "A004"
   *                 reason: "인증 세션 정보가 없거나 유효하지 않습니다."
   *                 data: null
   *               success: null
   *       500:
   *         description: 서버 내부 오류
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   */

  try {
    const { projectId } = req.params;
    const { sort, filter, search } = req.query;
    const result = await videoService.getVideoList({
      projectId,
      sort,
      filter,
      search,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

// 내 영상 목록 조회
export async function handleGetMyVideoList(req, res, next) {
  /**
   * @swagger
   * /me/videos:
   *   get:
   *     summary: 내 영상 목록 조회
   *     description: |
   *       로그인한 사용자가 소유한 프로젝트의 영상 목록을 최신순으로 조회합니다.
   *       영상이 없는 경우 빈 목록을 반환합니다.
   *       각 영상에는 일반 댓글 수(rootCommentCount), 답글 수(replyCount),
   *       리액션 수(reactionCount), 조회 수(viewCount)가 함께 포함됩니다.
   *     tags:
   *       - Video
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 영상 목록 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/VideoListResponse"
   *             example:
   *               resultType: "SUCCESS"
   *               error: null
   *               success:
   *                 videos:
   *                   - videoId: "21"
   *                     title: "내 발표 리허설"
   *                     status: "ready"
   *                     durationSeconds: 95
   *                     rootCommentCount: 2
   *                     replyCount: 1
   *                     reactionCount: 7
   *                     viewCount: 4
   *                     thumbnailUrl: "https://example.com/thumb2.jpg"
   *                     createdAt: "2026-02-03T13:20:00.000Z"
   *       401:
   *         description: 인증 실패
   *         content:
   *           application/json:
   *             example:
   *               resultType: "FAILURE"
   *               error:
   *                 errorCode: "A004"
   *                 reason: "인증 세션 정보가 없거나 유효하지 않습니다."
   *                 data: null
   *               success: null
   *       500:
   *         description: 서버 내부 오류
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   */
  try {
    const result = await videoService.getMyVideoList({
      userId: req.user?.id,
    });
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
   *                       videoId: "2"
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
   *                           emojiType: "fire"
   *                           count: 3
   *                       comments:
   *                         - commentId: "15"
   *                           timestampMs: 2000
   *                           content: "여기 설명 좋아요"
   *                           createdAt: "2026-01-24T12:34:56.000Z"
   *                           user:
   *                             userId: "1"
   *                             name: "홍길동"
   *       401:
   *         description: 인증 실패
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             example:
   *               resultType: "FAILURE"
   *               error:
   *                 errorCode: "A004"
   *                 reason: "인증 세션 정보가 없거나 유효하지 않습니다."
   *                 data: null
   *               success: null
   *       404:
   *         description: 영상 없음
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
    const { videoId } = req.params;
    const result = await videoService.getVideoDetail({ videoId });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

// 영상 제목 조회
export async function handleGetVideoTitle(req, res, next) {
  /**
   * @swagger
   * /videos/{videoId}/title:
   *   get:
   *     summary: 영상 제목 조회
   *     description: 특정 영상의 제목과 생성일을 조회합니다.
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
   *         description: 영상 제목 조회 성공
   *         content:
   *           application/json:
   *             example:
   *               resultType: "SUCCESS"
   *               error: null
   *               success:
   *                 videoId: "2"
   *                 title: "발표 영상"
   *                 createdAt: "2026-02-11T10:00:00.000Z"
   *       400:
   *         description: 잘못된 요청 파라미터(videoId)
   *         content:
   *           application/json:
   *             examples:
   *               invalidVideoId:
   *                 value:
   *                   resultType: "FAILURE"
   *                   error:
   *                     errorCode: "P001"
   *                     reason: "videoId가 올바르지 않습니다."
   *                     data:
   *                       videoId: "abc"
   *                   success: null
   *       401:
   *         description: 인증 실패
   *         content:
   *           application/json:
   *             example:
   *               resultType: "FAILURE"
   *               error:
   *                 errorCode: "A004"
   *                 reason: "인증 세션 정보가 없거나 유효하지 않습니다."
   *                 data: null
   *               success: null
   *       404:
   *         description: 영상을 찾을 수 없음
   *         content:
   *           application/json:
   *             example:
   *               resultType: "FAILURE"
   *               error:
   *                 errorCode: "V001"
   *                 reason: "영상을 찾을 수 없습니다."
   *                 data:
   *                   videoId: "2"
   *               success: null
   *       500:
   *         description: 서버 내부 오류
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   */
  try {
    const { videoId } = req.params;
    const result = await videoService.getVideoTitle({ videoId });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

// 영상 제목 수정
export async function handlePatchVideoTitle(req, res, next) {
  /**
   * @swagger
   * /videos/{videoId}:
   *   patch:
   *     summary: 영상 제목 수정
   *     description: |
   *       특정 영상의 제목을 수정합니다.
   *       본인이 소유한 영상만 수정할 수 있습니다.
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
   *             type: object
   *             properties:
   *               title:
   *                 type: string
   *                 example: "수정된 영상 제목"
   *     responses:
   *       200:
   *         description: 영상 제목 수정 성공
   *         content:
   *           application/json:
   *             example:
   *               resultType: "SUCCESS"
   *               error: null
   *               success:
   *                 videoId: "2"
   *                 title: "수정된 영상 제목"
   *                 updatedAt: "2026-02-11T10:00:00.000Z"
   *       400:
   *         description: 잘못된 요청 파라미터(videoId/title)
   *         content:
   *           application/json:
   *             examples:
   *               invalidVideoId:
   *                 value:
   *                   resultType: "FAILURE"
   *                   error:
   *                     errorCode: "P001"
   *                     reason: "videoId가 올바르지 않습니다."
   *                     data:
   *                       videoId: "abc"
   *                   success: null
   *               invalidTitleType:
   *                 value:
   *                   resultType: "FAILURE"
   *                   error:
   *                     errorCode: "P001"
   *                     reason: "제목은 문자열이어야 합니다."
   *                     data:
   *                       title: 123
   *                   success: null
   *               blankTitle:
   *                 value:
   *                   resultType: "FAILURE"
   *                   error:
   *                     errorCode: "P001"
   *                     reason: "제목은 공백으로만 이루어질 수 없습니다."
   *                     data:
   *                       title: "   "
   *                   success: null
   *               titleTooLong:
   *                 value:
   *                   resultType: "FAILURE"
   *                   error:
   *                     errorCode: "P001"
   *                     reason: "제목은 100자를 초과할 수 없습니다."
   *                     data:
   *                       title: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
   *                   success: null
   *       401:
   *         description: 인증 실패
   *         content:
   *           application/json:
   *             example:
   *               resultType: "FAILURE"
   *               error:
   *                 errorCode: "A004"
   *                 reason: "인증 세션 정보가 없거나 유효하지 않습니다."
   *                 data: null
   *               success: null
   *       404:
   *         description: 영상 없음 또는 본인이 소유한 영상이 아님
   *         content:
   *           application/json:
   *             example:
   *               resultType: "FAILURE"
   *               error:
   *                 errorCode: "V001"
   *                 reason: "영상을 찾을 수 없습니다."
   *                 data:
   *                   videoId: "2"
   *               success: null
   *       500:
   *         description: 서버 내부 오류
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   */
  try {
    const { videoId } = req.params;
    const { title } = req.body;
    const result = await videoService.patchVideoTitle({
      videoId,
      userId: req.user?.id,
      title,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

// 영상 삭제
export async function handleDeleteVideo(req, res, next) {
  /**
   * @swagger
   * /videos/{videoId}:
   *   delete:
   *     summary: 영상 삭제 (Soft Delete)
   *     description: |
   *       특정 영상을 소프트 삭제합니다.
   *       삭제 시 영상 상태를 `deleted`로 변경하고 `deletedAt`을 기록합니다.
   *       본인이 생성한 영상(본인 프로젝트에 속한 영상)만 삭제할 수 있습니다.
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
   *         description: 영상 삭제 성공
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/VideoDeleteResponse"
   *             example:
   *               resultType: "SUCCESS"
   *               error: null
   *               success:
   *                 videoId: "2"
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
   *                   videoId: 0
   *               success: null
   *       401:
   *         description: 인증 실패
   *         content:
   *           application/json:
   *             example:
   *               resultType: "FAILURE"
   *               error:
   *                 errorCode: "A004"
   *                 reason: "인증 세션 정보가 없거나 유효하지 않습니다."
   *                 data: null
   *               success: null
   *       404:
   *         description: 영상 없음 또는 본인이 생성한 영상이 아님
   *         content:
   *           application/json:
   *             example:
   *               resultType: "FAILURE"
   *               error:
   *                 errorCode: "V001"
   *                 reason: "영상을 찾을 수 없습니다."
   *                 data:
   *                   videoId: "2"
   *               success: null
   *       500:
   *         description: 서버 내부 오류
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   */
  try {
    const { videoId } = req.params;
    const result = await videoService.deleteVideo({
      videoId,
      userId: req.user?.id,
    });
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
   *                         slideNum: 1
   *                         title: "도입"
   *                         timestampMs: 0
   *                       - slideId: "2"
   *                         slideNum: 2
   *                         title: null
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
   *         content:
   *           application/json:
   *             example:
   *               resultType: "FAILURE"
   *               error:
   *                 errorCode: "A004"
   *                 reason: "인증 세션 정보가 없거나 유효하지 않습니다."
   *                 data: null
   *               success: null
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
   *       500:
   *         description: 서버 내부 오류
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
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
 *         videoId:
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
 *         rootCommentCount:
 *           type: integer
 *           description: 영상 일반 댓글 수(parentId=null)
 *           example: 5
 *         replyCount:
 *           type: integer
 *           description: 영상 답글 수(parentId!=null)
 *           example: 3
 *         feedbackCount:
 *           type: integer
 *           description: 영상 피드백 수(rootCommentCount + replyCount)
 *           example: 8
 *         reactionCount:
 *           type: integer
 *           description: 영상 리액션 수
 *           example: 12
 *         viewCount:
 *           type: integer
 *           description: 영상 조회 수(재생 play 이벤트의 고유 세션 수)
 *           example: 8
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
 *                 videoId:
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
 *                       commentId:
 *                         type: string
 *                       timestampMs:
 *                         type: integer
 *                       content:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       user:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                             nullable: true
 *                           name:
 *                             type: string
 *                             nullable: true
 *                           profileImageUrl:
 *                             type: string
 *                             nullable: true
 *
 *     VideoSlideTimelineItem:
 *       type: object
 *       properties:
 *         slideId:
 *           type: string
 *           description: 슬라이드 ID(BigInt → string)
 *           example: "1"
 *         slideNum:
 *           type: integer
 *           nullable: true
 *           description: 슬라이드 번호(설정되지 않은 경우 null)
 *           example: 2
 *         title:
 *           type: string
 *           nullable: true
 *           description: 슬라이드 제목(설정되지 않은 경우 null)
 *           example: "도입"
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
 *
 *     VideoDeleteResponse:
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
 *               description: 삭제된 영상 ID(BigInt → string)
 *               example: "2"
 */
