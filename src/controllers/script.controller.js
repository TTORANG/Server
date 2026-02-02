import { scriptResponseDTO, scriptVersionResponseDTO } from "../dtos/script.dto.js";
import {
  processScriptGet,
  processScriptRestore,
  processScriptUpdate,
  processScriptVersionGet,
} from "../services/script.service.js";

/**
 * @swagger
 * /presentations/slides/{slideId}/script:
 *   patch:
 *     summary: 대본 저장 및 수정 (자동 저장)
 *     description: 특정 슬라이드의 대본을 저장하거나 수정합니다. 수정 시 자동으로 새로운 버전 히스토리가 생성됩니다.
 *     tags: [Script]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slideId
 *         required: true
 *         schema:
 *           type: string
 *           example: "1"
 *         description: 대본을 저장할 슬라이드 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               script:
 *                 type: string
 *                 example: "안녕하세요, 오늘 발표를 맡은..."
 *     responses:
 *       200:
 *         description: 대본 저장 및 버전 생성 성공
 *         content:
 *           application/json:
 *             example:
 *               resultType: "SUCCESS"
 *               error: null
 *               success:
 *                 message: "대본이 성공적으로 저장되었습니다."
 *                 slideId: "1"
 *                 charCount: 20
 *                 scriptText: "안녕하세요, 오늘 발표를 맡은..."
 *                 estimatedDurationSeconds: 4
 *                 createdAt: "2026-01-23T10:00:00.000Z"
 *                 updatedAt: "2026-01-23T10:05:00.000Z"
 */
export const handleUploadScript = async (req, res, next) => {
  try {
    const { slideId } = req.params;
    const { script } = req.body;

    const { result, isUpdated } = await processScriptUpdate(slideId, script);

    const message = isUpdated
      ? "대본이 성공적으로 저장되었습니다"
      : "변경사항이 없어 저장되지 않았습니다.";
    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: {
        message: message,
        ...scriptResponseDTO(result),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /presentations/slides/{slideId}/script:
 *   get:
 *     summary: 대본 조회
 *     description: 특정 슬라이드에 작성된 대본 정보를 조회합니다.
 *     tags: [Script]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slideId
 *         required: true
 *         schema:
 *           type: string
 *           example: "1"
 *         description: 대본을 조회할 슬라이드 ID
 *     responses:
 *       200:
 *         description: 대본 조회 성공
 *         content:
 *           application/json:
 *             example:
 *               resultType: "SUCCESS"
 *               error: null
 *               success:
 *                 message: "대본이 성공적으로 조회되었습니다."
 *                 slideId: "1"
 *                 charCount: 150
 *                 scriptText: "안녕하세요, 오늘 발표를 맡은..."
 *                 estimatedDurationSeconds: 30
 *                 createdAt: "2026-01-23T09:00:00.000Z"
 *                 updatedAt: "2026-01-23T09:30:00.000Z"
 */
export const handleGetScript = async (req, res, next) => {
  try {
    const { slideId } = req.params;
    const result = await processScriptGet(slideId);
    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: {
        message: "대본이 성공적으로 조회되었습니다.",
        ...scriptResponseDTO(result),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /presentations/slides/{slideId}/versions:
 *   get:
 *     summary: 대본 버전 히스토리 목록 조회
 *     description: 특정 슬라이드의 대본 변경 이력(버전 목록)을 최신순으로 조회합니다.
 *     tags: [Script]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slideId
 *         required: true
 *         schema:
 *           type: string
 *           example: "1"
 *         description: 버전 히스토리를 조회할 슬라이드 ID
 *     responses:
 *       200:
 *         description: 버전 히스토리 조회 성공
 *         content:
 *           application/json:
 *             example:
 *               resultType: "SUCCESS"
 *               error: null
 *               success:
 *                 - versionNumber: 2
 *                   scriptText: "수정된 두 번째 버전 내용..."
 *                   charCount: 45
 *                   createdAt: "2026-01-23T11:00:00.000Z"
 *                 - versionNumber: 1
 *                   scriptText: "최초 작성된 대본 내용..."
 *                   charCount: 20
 *                   createdAt: "2026-01-23T10:00:00.000Z"
 */
export const handleGetScriptVersion = async (req, res, next) => {
  try {
    const { slideId } = req.params;
    const result = await processScriptVersionGet(slideId);
    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: scriptVersionResponseDTO(result),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /presentations/slides/{slideId}/restore:
 *   post:
 *     summary: 특정 버전으로 대본 복원
 *     description: 히스토리 중 특정 버전의 내용으로 현재 대본을 복원합니다.
 *     tags: [Script]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slideId
 *         required: true
 *         schema:
 *           type: string
 *           example: "1"
 *         description: 복원 작업을 수행할 슬라이드 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               version:
 *                 type: integer
 *                 example: 1
 *                 description: 복원하고자 하는 버전 번호
 *     responses:
 *       200:
 *         description: 대본 복원 성공
 *         content:
 *           application/json:
 *             example:
 *               resultType: "SUCCESS"
 *               error: null
 *               success:
 *                 message: "대본이 성공적으로 복원되었습니다."
 *                 slideId: "1"
 *                 charCount: 20
 *                 scriptText: "안녕하세요, 오늘 발표를 맡은..."
 *                 estimatedDurationSeconds: 4
 *                 createdAt: "2026-01-23T09:00:00.000Z"
 *                 updatedAt: "2026-01-23T09:30:00.000Z"
 *       404:
 *         description: 대본 또는 버전을 찾을 수 없음 (SC001, SC002)
 *         content:
 *           application/json:
 *             example:
 *               resultType: "FAILURE"
 *               error:
 *                 errorCode: "SC002"
 *                 reason: "버전이 존재하지 않습니다."
 *                 data:
 *                   slideId: 1
 *               success: null
 */
export const handleRestoreVersion = async (req, res, next) => {
  try {
    const { slideId } = req.params;
    const { version } = req.body;
    const result = await processScriptRestore(slideId, version);

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: {
        message: "대본이 성공적으로 복원되었습니다.",
        ...scriptResponseDTO(result),
      },
    });
  } catch (error) {
    next(error);
  }
};
