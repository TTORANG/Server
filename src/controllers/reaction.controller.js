import { toggleVideoReaction } from "../services/reaction.service.js";

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
