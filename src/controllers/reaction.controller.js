import {
  reactionBucketsResponseDTO,
  reactionMarkersResponseDTO,
  ToggleReactionDto,
} from "../dtos/reaction.dto.js";
import {
  createSlideReactionEvent,
  createVideoReactionEvent,
  getProjectSlidesReactionSummary,
  getReactionBuckets,
  getReactionMarkers,
  getSlideReactionSummary,
  getVideoReactionsByTime,
} from "../services/reaction.service.js";

async function createSlideReaction(req, res, next) {
  try {
    const dto = ToggleReactionDto(req.body);

    const result = await createSlideReactionEvent({
      slideId: req.params.slideId,
      emojiType: dto.emojiType,
      userId: req.user.id,
    });

    res.json({
      resultType: "SUCCESS",
      error: null,
      success: result,
    });
  } catch (e) {
    next(e);
  }
}

// 리액션 생성 (구 경로 - deprecated)
export async function toggleSlideReactionController(req, res, next) {
  /**
   * @swagger
   * /slides/{slideId}/reactions/toggle:
   *   post:
   *     deprecated: true
   *     summary: (Deprecated) 슬라이드 이모지 리액션 생성
   *     description: |
   *       이 경로는 하위 호환용입니다. 신규 연동은 `POST /slides/{slideId}/reactions`를 사용하세요.
   *       동작/요청/응답은 신규 경로와 동일합니다.
   *     tags:
   *       - Reaction
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: slideId
   *         required: true
   *         schema:
   *           type: string
   *         description: 슬라이드 ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: "#/components/schemas/SlideReactionCreateRequest"
   *     responses:
   *       200:
   *         description: 리액션 생성 성공 (카운트 +1 반영)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/SlideReactionCreateResponse"
   *       400:
   *         description: 잘못된 요청 (유효하지 않은 이모지 타입 등)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               INVALID_EMOJI:
   *                 summary: 유효하지 않은 이모지 타입
   *                 value:
   *                   resultType: FAILURE
   *                   error:
   *                     errorCode: R002
   *                     reason: 유효하지 않은 이모지 타입입니다.
   *                     data:
   *                       emojiType: angry
   *                   success: null
   *               REACTION_PROCESS_FAILED:
   *                 summary: 리액션 처리 실패
   *                 value:
   *                   resultType: FAILURE
   *                   error:
   *                     errorCode: R003
   *                     reason: 리액션을 처리할 수 없습니다.
   *                     data:
   *                       slideId: "10"
   *                       emojiType: "fire"
   *                   success: null
   *
   *       401:
   *         description: 인증 실패
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               UNAUTHORIZED:
   *                 summary: 인증 정보 없음
   *                 value:
   *                   resultType: FAILURE
   *                   error:
   *                     errorCode: A004
   *                     reason: 인증 세션 정보가 없거나 유효하지 않습니다.
   *                     data: null
   *                   success: null
   *
   *       404:
   *         description: 슬라이드 없음
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               SLIDE_NOT_FOUND:
   *                 summary: 슬라이드 미존재
   *                 value:
   *                   resultType: FAILURE
   *                   error:
   *                     errorCode: R001
   *                     reason: 슬라이드를 찾을 수 없습니다.
   *                     data:
   *                       slideId: "10"
   *                   success: null
   *       500:
   *         description: 서버 내부 오류
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *
   */
  return createSlideReaction(req, res, next);
}

// 리액션 생성 (신규 경로)
export async function handleCreateSlideReaction(req, res, next) {
  /**
   * @swagger
   * /slides/{slideId}/reactions:
   *   post:
   *     summary: 슬라이드 이모지 리액션 생성
   *     description: |
   *       슬라이드에 대해 이모지 리액션 이벤트를 생성합니다.
   *       같은 사용자/같은 슬라이드/같은 이모지도 요청할 때마다 신규 row로 기록됩니다.
   *       즉, 토글(on/off) 개념이 아니라 "요청 1회 = 카운트 1 증가" 모델입니다.
   *       사용자 기준 슬라이드별 100ms당 1회 요청만 허용됩니다. (초과 시 에러 응답)
   *
   *       슬라이드 리액션은 `timestampMs=null` 기준으로 저장됩니다.
   *       인증된 사용자라면 리소스 소유자와 무관하게 호출할 수 있습니다.
   *       - `emojiType`은 필수 문자열이며 허용값은 `fire`, `good`, `bad`, `sleepy`, `confused` 입니다.
   *
   *       성공 시 실시간 이벤트가 발행됩니다.
   *       - Socket Event: `new-reaction`
   *       - Payload: `{ reactionId, projectId, slideId, userId, emoji }`
   *     tags: [Reaction]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: slideId
   *         required: true
   *         schema:
   *           type: string
   *         description: 슬라이드 ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: "#/components/schemas/SlideReactionCreateRequest"
   *     responses:
   *       200:
   *         description: 리액션 생성 성공 (카운트 +1 반영)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/SlideReactionCreateResponse"
   *       400:
   *         description: 잘못된 요청 (유효하지 않은 이모지 타입, 요청 제한 초과 등)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               invalidEmoji:
   *                 value:
   *                   resultType: FAILURE
   *                   error:
   *                     errorCode: R002
   *                     reason: 유효하지 않은 이모지 타입입니다.
   *                     data:
   *                       emojiType: angry
   *                   success: null
   *               rateLimited:
   *                 value:
   *                   resultType: FAILURE
   *                   error:
   *                     errorCode: P001
   *                     reason: 리액션 요청은 100ms당 1회만 가능합니다.
   *                     data:
   *                       limit: 1
   *                       windowMs: 100
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
   *       500:
   *         description: 서버 내부 오류
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   */
  return createSlideReaction(req, res, next);
}

// 리액션 집계 조회
export async function getSlideReactionSummaryController(req, res, next) {
  /**
   * @swagger
   * /slides/{slideId}/reactions/summary:
   *   get:
   *     summary: 슬라이드 리액션 집계 조회
   *     description: |
   *       특정 슬라이드에 달린 모든 이모지 리액션을 집계하여 반환한다.
   *
   *       - 취소된 리액션(isDeleted=true)은 집계에서 제외된다.
   *       - 리액션이 없는 이모지는 0으로 반환된다.
   *       - `active`는 해당 이모지의 집계값(`reactions`)이 1 이상이면 true이다.
   *       - 인증된 사용자라면 리소스 소유자와 무관하게 조회할 수 있다.
   *     tags:
   *       - Reaction
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: slideId
   *         required: true
   *         schema:
   *           type: string
   *         description: 슬라이드 ID
   *     responses:
   *       200:
   *         description: 리액션 집계 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 resultType:
   *                   type: string
   *                   example: SUCCESS
   *                 error:
   *                   type: object
   *                   nullable: true
   *                   example: null
   *                 success:
   *                   type: object
   *                   description: 슬라이드 리액션 집계 결과
   *                   properties:
   *                     slideId:
   *                       type: string
   *                       example: "10"
   *                     reactions:
   *                       type: object
   *                       additionalProperties:
   *                         type: integer
   *                       example:
   *                         fire: 5
   *                         good: 3
   *                         bad: 0
   *                         sleepy: 1
   *                         confused: 2
   *                     active:
   *                       type: object
   *                       additionalProperties:
   *                         type: boolean
   *                       example:
   *                         fire: true
   *                         good: true
   *                         bad: false
   *                         sleepy: true
   *                         confused: true
   *                   example:
   *                     slideId: "10"
   *                     reactions:
   *                       fire: 5
   *                       good: 3
   *                       bad: 0
   *                       sleepy: 1
   *                       confused: 2
   *                     active:
   *                       fire: true
   *                       good: true
   *                       bad: false
   *                       sleepy: true
   *                       confused: true
   *
   *       401:
   *         description: 인증 실패
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               UNAUTHORIZED:
   *                 summary: 인증 토큰 없음 또는 만료
   *                 value:
   *                   resultType: FAILURE
   *                   error:
   *                     errorCode: A004
   *                     reason: 인증 세션 정보가 없거나 유효하지 않습니다.
   *                     data: null
   *                   success: null
   *
   *       404:
   *         description: 슬라이드 없음
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               SLIDE_NOT_FOUND:
   *                 summary: 슬라이드 미존재
   *                 value:
   *                   resultType: FAILURE
   *                   error:
   *                     errorCode: R001
   *                     reason: 슬라이드를 찾을 수 없습니다.
   *                     data:
   *                       slideId: "10"
   *                   success: null
   *       500:
   *         description: 서버 내부 오류
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *
   */
  try {
    const result = await getSlideReactionSummary({
      slideId: req.params.slideId,
    });

    res.json({
      resultType: "SUCCESS",
      error: null,
      success: result,
    });
  } catch (e) {
    next(e);
  }
}

// 영상 타임스탬프 리액션 생성
export async function handleCreateVideoReaction(req, res, next) {
  /**
   * @swagger
   * /videos/{videoId}/reactions:
   *   post:
   *     summary: 영상 타임스탬프 리액션 생성
   *     description: |
   *       특정 영상의 특정 시점(timestampMs)에 대해 이모지 리액션 이벤트를 생성합니다.
   *       같은 사용자/같은 영상/같은 시점/같은 이모지도 요청할 때마다 신규 row로 기록됩니다.
   *       즉, 토글(on/off) 개념이 아니라 "요청 1회 = 카운트 1 증가" 모델입니다.
   *
   *       **주의사항**
   *       - 본 API는 인증(JWT)이 필요합니다.
   *       - 인증된 사용자라면 리소스 소유자와 무관하게 호출할 수 있습니다.
   *       - `timestampMs`는 필수이며 0 이상의 정수(ms)만 허용합니다.
   *       - `emojiType`은 필수 문자열이며 허용값은 `fire`, `good`, `bad`, `sleepy`, `confused` 입니다.
   *       - 사용자 기준 영상별 100ms당 1회 요청만 허용됩니다. (초과 시 에러 응답)
   *
   *       성공 시 실시간 이벤트가 발행됩니다.
   *       - Socket Event: `new-reaction`
   *       - Payload: `{ reactionId, projectId, videoId, userId, emoji, timestampMs }`
   *     tags: [Reaction]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: videoId
   *         required: true
   *         schema:
   *           type: integer
   *         description: 영상 ID (양의 정수)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: "#/components/schemas/VideoReactionCreateRequest"
   *           examples:
   *             fireAt2s:
   *               summary: 2초 지점 fire 리액션
   *               value:
   *                 emojiType: "fire"
   *                 timestampMs: 2000
   *     responses:
   *       200:
   *         description: 생성 성공 (카운트 +1 반영)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/VideoReactionCreateResponse"
   *             examples:
   *               created:
   *                 summary: 리액션 row 생성됨
   *                 value:
   *                   resultType: "SUCCESS"
   *                   error: null
   *                   success:
   *                     reactionId: "123"
   *                     videoId: "21"
   *                     emojiType: "fire"
   *                     timestampMs: 2000
   *                     createdAt: "2026-02-10T05:10:00.000Z"
   *       400:
   *         description: 잘못된 입력 또는 요청 제한(rate-limit) 초과
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
   *               rateLimited:
   *                 value:
   *                   resultType: "FAILURE"
   *                   error:
   *                     errorCode: "P001"
   *                     reason: "리액션 요청은 100ms당 1회만 가능합니다."
   *                     data:
   *                       limit: 1
   *                       windowMs: 100
   *                   success: null
   *       401:
   *         description: 인증 실패
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               unauthorized:
   *                 value:
   *                   resultType: "FAILURE"
   *                   error:
   *                     errorCode: "A004"
   *                     reason: "인증 세션 정보가 없거나 유효하지 않습니다."
   *                     data: null
   *                   success: null
   *       404:
   *         description: 영상을 찾을 수 없음(미존재 또는 삭제됨)
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
    const { emojiType, timestampMs } = req.body;

    const result = await createVideoReactionEvent({
      videoId: req.params.videoId,
      emojiType,
      timestampMs,
      userId: req.user.id,
    });

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: result,
    });
  } catch (e) {
    next(e);
  }
}

// 영상 리액션 집계
export const getVideoReactionMarkers = async (req, res, next) => {
  /**
   * @swagger
   * /videos/{videoId}/reactions/timeline:
   *   get:
   *     summary: 타임라인별 리액션 조회
   *     description: |
   *       영상 전체 리액션을 기준으로 intervalMs 단위로 묶어,
   *       각 구간별 대표 이모지(가장 많이 눌린 이모지)와 count를 반환합니다.
   *
   *       - 기본 intervalMs=5000 (5초)
   *       - timestampMs가 없는 리액션은 집계에서 제외됩니다.
   *       - 인증된 사용자라면 리소스 소유자와 무관하게 조회할 수 있습니다.
   *     tags: [Reaction]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: videoId
   *         required: true
   *         schema:
   *           type: integer
   *         description: 영상 ID (양의 정수)
   *       - in: query
   *         name: intervalMs
   *         required: false
   *         schema:
   *           type: integer
   *           default: 5000
   *         description: 버킷 간격(ms). 기본 5000
   *     responses:
   *       200:
   *         description: 마커 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ReactionMarkersResponse"
   *       400:
   *         description: 잘못된 요청(videoId/intervalMs)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *       404:
   *         description: 영상을 찾을 수 없음(미존재 또는 삭제됨)
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
    const intervalMs = req.query.intervalMs;

    const result = await getReactionMarkers({
      videoId: req.params.videoId,
      intervalMs,
    });

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: reactionMarkersResponseDTO(result),
    });
  } catch (e) {
    next(e);
  }
};

// 영상 리액션 버킷별 상세 집계
export const getVideoReactionBuckets = async (req, res, next) => {
  /**
   * @swagger
   * /videos/{videoId}/reactions/timeline/buckets:
   *   get:
   *     summary: 타임라인 버킷별 전체 리액션 조회
   *     description: |
   *       영상 전체 리액션을 intervalMs 단위 버킷으로 묶어,
   *       각 구간의 전체 이모지별 개수와 totalCount를 반환합니다.
   *
   *       - 기본 intervalMs=5000 (5초)
   *       - timestampMs가 없는 리액션은 집계에서 제외됩니다.
   *       - 버킷의 reactions는 허용 이모지 키를 모두 포함하며, 없는 값은 0입니다.
   *       - 인증된 사용자라면 리소스 소유자와 무관하게 조회할 수 있습니다.
   *     tags: [Reaction]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: videoId
   *         required: true
   *         schema:
   *           type: integer
   *         description: 영상 ID (양의 정수)
   *       - in: query
   *         name: intervalMs
   *         required: false
   *         schema:
   *           type: integer
   *           default: 5000
   *         description: 버킷 간격(ms). 기본 5000
   *     responses:
   *       200:
   *         description: 버킷 집계 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ReactionBucketsResponse"
   *       400:
   *         description: 잘못된 요청(videoId/intervalMs)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *       404:
   *         description: 영상을 찾을 수 없음(미존재 또는 삭제됨)
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
    const intervalMs = req.query.intervalMs;

    const result = await getReactionBuckets({
      videoId: req.params.videoId,
      intervalMs,
    });

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: reactionBucketsResponseDTO(result),
    });
  } catch (e) {
    next(e);
  }
};

// 시간대별 리액션 조회
export const getVideoReactionsByTimeController = async (req, res, next) => {
  /**
   * @swagger
   * /videos/{videoId}/reactions:
   *   get:
   *     summary: 시간대별 영상 리액션 조회
   *     description: |
   *       영상의 현재 재생 시간 기준으로 ±2초 범위 내 리액션을 조회합니다.
   *       동일 시간대의 리액션은 이모지 타입별로 집계되어 반환됩니다.
   *       인증된 사용자라면 리소스 소유자와 무관하게 조회할 수 있습니다.
   *     tags: [Reaction]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: videoId
   *         required: true
   *         schema:
   *           type: integer
   *         description: 영상 ID (양의 정수)
   *       - in: query
   *         name: timestampMs
   *         required: true
   *         schema:
   *           type: integer
   *         description: 현재 재생 시간 (ms)
   *         example: 12000
   *       - in: query
   *         name: windowMs
   *         required: false
   *         schema:
   *           type: integer
   *           default: 2000
   *         description: 조회 범위(ms). 0 이상의 정수. 기본값 ±2000ms
   *     responses:
   *       200:
   *         description: 시간대별 리액션 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/VideoReactionGroupResponse"
   *       400:
   *         description: 잘못된 요청 파라미터
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               invalidTimestamp:
   *                 value:
   *                   resultType: FAILURE
   *                   error:
   *                     errorCode: P001
   *                     reason: 요청 파라미터가 올바르지 않습니다.
   *                     data:
   *                       timestampMs: "abc"
   *                   success: null
   *               invalidWindowMs:
   *                 value:
   *                   resultType: FAILURE
   *                   error:
   *                     errorCode: P001
   *                     reason: 요청 파라미터가 올바르지 않습니다.
   *                     data:
   *                       windowMs: -1
   *                   success: null
   *       404:
   *         description: 영상을 찾을 수 없음(미존재 또는 삭제됨)
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
    const timestampMs = req.query.timestampMs;
    const windowMs = req.query.windowMs;

    const result = await getVideoReactionsByTime({
      videoId: req.params.videoId,
      timestampMs,
      windowMs,
    });

    res.json({
      resultType: "SUCCESS",
      error: null,
      success: result,
    });
  } catch (e) {
    next(e);
  }
};

// 프로젝트 모든 리액션 집계 조회
export async function getProjectSlidesReactionSummaryController(req, res, next) {
  /**
   * @swagger
   * /presentations/{projectId}/slides/reactions/summary:
   *   get:
   *     summary: 프로젝트 전체 슬라이드 리액션 집계 조회
   *     description: |
   *       특정 프로젝트의 모든 슬라이드에 달린 이모지 리액션을 한 번에 집계하여 반환합니다.
   *
   *       - 취소된 리액션(isDeleted=true)은 제외됩니다.
   *       - 슬라이드에 리액션이 없어도 허용 이모지 키는 0으로 채워 반환됩니다.
   *       - 슬라이드별 상세 목록은 반환하지 않고, 프로젝트 전체 합계만 반환합니다.
   *       - 인증된 사용자라면 리소스 소유자와 무관하게 조회할 수 있습니다.
   *     tags: [Reaction]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *         description: 프로젝트 ID
   *     responses:
   *       200:
   *         description: 집계 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ProjectSlidesReactionSummaryResponse"
   *       400:
   *         description: 잘못된 파라미터(projectId)
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
   *         description: 프로젝트 없음
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
    const result = await getProjectSlidesReactionSummary({
      projectId: req.params.projectId,
    });

    res.json({
      resultType: "SUCCESS",
      error: null,
      success: result,
    });
  } catch (e) {
    next(e);
  }
}

/**
 * @swagger
 * components:
 *   schemas:
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
 *               example: R001
 *             reason:
 *               type: string
 *               example: 슬라이드를 찾을 수 없습니다.
 *             data:
 *               type: object
 *               nullable: true
 *         success:
 *           type: object
 *           nullable: true
 *           example: null
 *     EmojiTypeEnum:
 *       type: string
 *       description: 리액션 이모지 타입
 *       enum:
 *         - fire
 *         - good
 *         - bad
 *         - sleepy
 *         - confused
 *     SlideReactionCreateRequest:
 *       type: object
 *       required:
 *         - emojiType
 *       properties:
 *         emojiType:
 *           $ref: "#/components/schemas/EmojiTypeEnum"
 *           example: "fire"
 *       description: |
 *         프론트 가이드:
 *         - 버튼 클릭(또는 탭) 시마다 호출합니다.
 *         - 같은 슬라이드/같은 이모지도 중복 호출 가능하며 호출 횟수만큼 누적됩니다.
 *         - 100ms 이내 중복 요청은 실패할 수 있으며, UI는 필요 시 무시 처리 가능합니다.
 *
 *     SlideReactionCreateResponse:
 *       type: object
 *       properties:
 *         resultType:
 *           type: string
 *           example: SUCCESS
 *         error:
 *           type: object
 *           nullable: true
 *           example: null
 *         success:
 *           type: object
 *           properties:
 *             reactionId:
 *               type: string
 *               example: "123"
 *             slideId:
 *               type: string
 *               example: "10"
 *             emojiType:
 *               type: string
 *               example: "fire"
 *             createdAt:
 *               type: string
 *               format: date-time
 *               example: "2026-02-10T05:10:00.000Z"
 *
 *     VideoReactionCreateRequest:
 *       type: object
 *       required:
 *         - emojiType
 *         - timestampMs
 *       properties:
 *         emojiType:
 *           $ref: "#/components/schemas/EmojiTypeEnum"
 *           example: "fire"
 *         timestampMs:
 *           type: integer
 *           description: 현재 재생 위치(ms)
 *           example: 12500
 *       description: |
 *         프론트 가이드:
 *         - 버튼 클릭(또는 탭) 시마다 호출합니다.
 *         - 같은 timestampMs라도 중복 호출 가능하며 호출 횟수만큼 누적됩니다.
 *         - 100ms 이내 중복 요청은 실패할 수 있으며, UI는 필요 시 무시 처리 가능합니다.
 *
 *     VideoReactionCreateResponse:
 *       type: object
 *       properties:
 *         resultType:
 *           type: string
 *           example: SUCCESS
 *         error:
 *           nullable: true
 *           example: null
 *         success:
 *           $ref: "#/components/schemas/VideoReactionCreateSuccess"
 *
 *     ReactionMarker:
 *       type: object
 *       properties:
 *         timestampMs:
 *           type: integer
 *           example: 5000
 *         emojiType:
 *           type: string
 *           example: "fire"
 *         count:
 *           type: integer
 *           example: 7
 *
 *     ReactionMarkersSuccess:
 *       type: object
 *       properties:
 *         intervalMs:
 *           type: integer
 *           example: 5000
 *         markers:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/ReactionMarker"
 *
 *     ReactionMarkersResponse:
 *       type: object
 *       properties:
 *         resultType:
 *           type: string
 *           example: SUCCESS
 *         error:
 *           nullable: true
 *           example: null
 *         success:
 *           $ref: "#/components/schemas/ReactionMarkersSuccess"
 *
 *     ReactionBucket:
 *       type: object
 *       properties:
 *         timestampMs:
 *           type: integer
 *           example: 5000
 *         totalCount:
 *           type: integer
 *           example: 11
 *         reactions:
 *           type: object
 *           additionalProperties:
 *             type: integer
 *           example:
 *             fire: 7
 *             good: 2
 *             bad: 0
 *             sleepy: 1
 *             confused: 1
 *
 *     ReactionBucketsSuccess:
 *       type: object
 *       properties:
 *         intervalMs:
 *           type: integer
 *           example: 5000
 *         buckets:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/ReactionBucket"
 *
 *     ReactionBucketsResponse:
 *       type: object
 *       properties:
 *         resultType:
 *           type: string
 *           example: SUCCESS
 *         error:
 *           nullable: true
 *           example: null
 *         success:
 *           $ref: "#/components/schemas/ReactionBucketsSuccess"
 *
 *     VideoReactionGroupItem:
 *       type: object
 *       properties:
 *         emojiType:
 *           type: string
 *           description: 이모지 타입
 *           example: "fire"
 *         count:
 *           type: integer
 *           description: 해당 이모지 리액션 수
 *           example: 5
 *
 *     VideoReactionGroupResponse:
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
 *           description: 시간대별 리액션 집계 결과
 *           items:
 *             $ref: "#/components/schemas/VideoReactionGroupItem"
 *
 *     ProjectSlidesReactionSummarySuccess:
 *       type: object
 *       properties:
 *         projectId:
 *           type: string
 *           example: "12"
 *         totalReactions:
 *           type: object
 *           additionalProperties:
 *             type: integer
 *           example:
 *             fire: 10
 *             good: 4
 *             bad: 2
 *             sleepy: 1
 *             confused: 7
 *         totalCount:
 *           type: integer
 *           example: 23
 *
 *     ProjectSlidesReactionSummaryResponse:
 *       type: object
 *       properties:
 *         resultType:
 *           type: string
 *           example: SUCCESS
 *         error:
 *           nullable: true
 *           example: null
 *         success:
 *           $ref: "#/components/schemas/ProjectSlidesReactionSummarySuccess"
 *
 *     VideoReactionCreateSuccess:
 *       type: object
 *       properties:
 *         reactionId:
 *           type: string
 *           description: 리액션 ID (BigInt → string)
 *           example: "123"
 *         videoId:
 *           type: string
 *           description: 영상 ID (BigInt → string)
 *           example: "21"
 *         emojiType:
 *           type: string
 *           description: 이모지 타입
 *           example: "fire"
 *         timestampMs:
 *           type: integer
 *           description: 리액션 생성 시점(ms)
 *           example: 2000
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 서버에 리액션 row가 생성된 시각(UTC ISO 8601)
 *           example: "2026-02-10T05:10:00.000Z"
 */
