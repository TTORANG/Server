import { getPresentationConversionStatus } from "../services/conversion/conversionStatus.service.js";

// 변환 상태 조회
export const handleGetPresentationStatus = async (req, res, next) => {
  /**
   * @swagger
   * /presentations/{projectId}/status:
   *   get:
   *     summary: 프로젝트 파일 변환 상태 조회
   *     description: |
   *       PPTX/PDF 파일의 변환 진행 상태를 조회합니다.
   *       파일 업로드 이후 슬라이드 이미지 변환, 썸네일 생성, 메타데이터 추출까지의
   *       전체 변환 파이프라인 상태를 집계하여 반환합니다.
   *
   *       - status 값: queued | processing | failed | completed | partial_done
   *       - progress는 completed/partial_done일 때만 반환되며, 그 외에는 null 입니다.
   *     tags: [Presentation]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *           example: "1"
   *         description: 프로젝트 ID
   *     responses:
   *       200:
   *         description: 변환 상태 조회 성공
   *         content:
   *           application/json:
   *             example:
   *               resultType: "SUCCESS"
   *               error: null
   *               success:
   *                 status: "processing"
   *                 progress: null
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
   *         description: 프로젝트를 찾을 수 없음
   *         content:
   *           application/json:
   *             example:
   *               resultType: "FAILURE"
   *               error:
   *                 errorCode: "P001"
   *                 reason: "해당 프로젝트를 찾을 수 없습니다."
   *               success: null
   */
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const result = await getPresentationConversionStatus(projectId, userId);

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: {
        status: result.status,
        progress: result.progress ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
};
