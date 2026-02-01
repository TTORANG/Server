import { ToggleReactionDto } from "../dtos/reaction.dto.js";
import { toggleSlideReaction, toggleVideoReaction } from "../services/reaction.service.js";

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
   *         description: 슬라이드 ID (BigInt → string)
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

    const result = await toggleVideoReaction({
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
 *     SlideReactionCountResponse:
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
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               emojiType:
 *                 type: string
 *                 example: thumbs_up
 *               count:
 *                 type: integer
 *                 example: 12
 */
