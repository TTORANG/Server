import { reactionMarkersResponseDTO, ToggleReactionDto } from "../dtos/reaction.dto.js";
import { InvalidParameterError } from "../errors/video.error.js";
import {
  getProjectSlidesReactionSummary,
  getReactionMarkers,
  getSlideReactionSummary,
  getVideoReactionsByTime,
  toggleSlideReaction,
  toggleVideoReaction,
} from "../services/reaction.service.js";

// 리액션 생성 및 취소
export async function toggleSlideReactionController(req, res, next) {
  /**
   * @swagger
   * /slides/{slideId}/reactions/toggle:
   *   post:
   *     summary: 슬라이드 이모지 리액션 추가/취소
   *     description: |
   *       슬라이드에 대해 이모지 리액션을 토글 방식으로 처리한다.
   *       - 기존 리액션이 없으면 추가
   *       - 이미 존재하면 취소(isDeleted=true)
   *       - 취소된 리액션이 있으면 재활성화
   *
   *       슬라이드 리액션은 timestampMs=null 기준으로 처리된다.
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
   *             $ref: "#/components/schemas/ToggleSlideReactionRequest"
   *     responses:
   *       200:
   *         description: 리액션 처리 성공
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ToggleSlideReactionResponse"
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
   *                     errorCode: A001
   *                     reason: 인증이 필요합니다.
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
   *
   *       500:
   *         description: 서버 오류
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               INTERNAL_ERROR:
   *                 summary: 서버 내부 오류
   *                 value:
   *                   resultType: FAILURE
   *                   error:
   *                     errorCode: R999
   *                     reason: 서버 오류
   *                     data: null
   *                   success: null
   */
  try {
    const dto = ToggleReactionDto(req.body);

    const result = await toggleSlideReaction({
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
   *                   description: 이모지 타입별 리액션 개수
   *                   example:
   *                     thumbs_up: 5
   *                     heart: 3
   *                     eyes: 0
   *                     clap: 1
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
   *                     errorCode: A001
   *                     reason: 인증이 필요합니다.
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
   *
   *       500:
   *         description: 서버 오류
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *             examples:
   *               INTERNAL_ERROR:
   *                 summary: 서버 내부 오류
   *                 value:
   *                   resultType: FAILURE
   *                   error:
   *                     errorCode: R999
   *                     reason: 서버 오류
   *                     data: null
   *                   success: null
   */
  try {
    const result = await getSlideReactionSummary({
      slideId: req.params.slideId,
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
   *       - 본 API는 인증(JWT)이 필요합니다.
   *       - `timestampMs`는 0 이상의 정수(ms)만 허용합니다.
   *       - `emojiType`은 문자열이며, 서버/클라이언트에서 합의된 타입을 사용해야 합니다.
   *     tags: [Reaction]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: videoId
   *         required: true
   *         schema:
   *           type: integer
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
    const videoId = BigInt(req.params.videoId);
    const { emojiType, timestampMs } = req.body;

    const result = await toggleVideoReaction({
      videoId,
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
   *     tags: [Reaction]
   *     parameters:
   *       - in: path
   *         name: videoId
   *         required: true
   *         schema:
   *           type: integer
   *         description: 영상 ID
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
    const videoId = BigInt(req.params.videoId);

    // 기본 5000ms, 프론트가 바꾸고 싶으면 쿼리로 받기
    const intervalMs = req.query.intervalMs ? Number(req.query.intervalMs) : 5000;

    const result = await getReactionMarkers({
      videoId,
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
   *     tags: [Reaction]
   *     parameters:
   *       - in: path
   *         name: videoId
   *         required: true
   *         schema:
   *           type: integer
   *         description: 영상 ID
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
   *         description: 조회 범위(ms). 기본값 ±2000ms
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
   *       404:
   *         description: 영상 없음
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   */
  try {
    const videoId = BigInt(req.params.videoId);
    const timestampMs = Number(req.query.timestampMs);
    const windowMs = Number(req.query.windowMs ?? 2000);

    if (!Number.isInteger(timestampMs)) {
      throw new InvalidParameterError({ timestampMs: req.query.timestampMs });
    }

    const result = await getVideoReactionsByTime({
      videoId,
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
   */
  try {
    const result = await getProjectSlidesReactionSummary({
      projectId: req.params.projectId,
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
 *     ToggleSlideReactionRequest:
 *       type: object
 *       required:
 *         - emojiType
 *       properties:
 *         emojiType:
 *           type: string
 *           description: 리액션 이모지 타입
 *           enum:
 *             - thumbs_up
 *             - heart
 *             - eyes
 *             - clap
 *           example: thumbs_up
 *
 *     ToggleSlideReactionResponse:
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
 *             active:
 *               type: boolean
 *               description: |
 *                 현재 리액션 상태
 *                 - true: 활성(추가됨)
 *                 - false: 비활성(취소됨)
 *
 *     VideoReactionCreateRequest:
 *       type: object
 *       required:
 *         - emojiType
 *       properties:
 *         emojiType:
 *           type: string
 *           description: 리액션 이모지 타입
 *           example: "😂"
 *         timestampMs:
 *           type: integer
 *           description: 현재 재생 위치(ms). 선택 값
 *           example: 12500
 *
 *     VideoReactionToggleResponse:
 *       type: object
 *       properties:
 *         resultType:
 *           type: string
 *           example: SUCCESS
 *         error:
 *           nullable: true
 *           example: null
 *         success:
 *           $ref: "#/components/schemas/VideoReactionToggleSuccess"
 *
 *     ReactionMarker:
 *       type: object
 *       properties:
 *         timestampMs:
 *           type: integer
 *           example: 5000
 *         emojiType:
 *           type: string
 *           example: "😂"
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
 *     VideoReactionGroupItem:
 *       type: object
 *       properties:
 *         emojiType:
 *           type: string
 *           description: 이모지 타입
 *           example: "😂"
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
 *             thumbs_up: 10
 *             heart: 4
 *             eyes: 2
 *             clap: 7
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
 *     VideoReactionToggleSuccess:
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
 *         active:
 *           type: boolean
 *           description: |
 *             현재 리액션 상태
 *             - true: 활성
 *             - false: 비활성
 *           example: true
 */
