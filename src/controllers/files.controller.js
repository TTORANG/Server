import { completeFileUpload } from "../services/files.service.js";
import { createUploadUrl } from "../services/gcs.service.js";
import { success } from "../utils/response.util.js";

export async function postUploadUrl(req, res, next) {
  /**
   * @openapi
   * /api/files/upload-url:
   *   post:
   *     summary: 파일 업로드용 Signed URL 발급
   *     description: GCS에 직접 업로드할 수 있는 Signed URL을 발급한다.
   *     tags: [File]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [purpose, contentType, size]
   *             properties:
   *               purpose:
   *                 type: string
   *                 enum: [presentation_file]
   *               contentType:
   *                 type: string
   *                 example: application/pdf
   *               size:
   *                 type: integer
   *                 example: 1048576
   *     responses:
   *       200:
   *         description: Signed URL 발급 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *             example:
   *               resultType: SUCCESS
   *               error: null
   *               success:
   *                 objectKey: dev/upload/temp/uuid.pdf
   *                 uploadUrl: https://storage.googleapis.com/...
   *                 expiresAt: "2026-01-15T12:00:00.000Z"
   *       400:
   *         description: 파일 업로드 요청 오류
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *             example:
   *               resultType: FAILURE
   *               error:
   *                 errorCode: F001
   *                 reason: 잘못된 파일 업로드 요청입니다.
   *                 data: null
   *               success: null
   */

  try {
    const result = await createUploadUrl(req.body);
    return success(res, result);
  } catch (e) {
    next(e);
  }
}

export async function postComplete(req, res, next) {
  /**
   * @openapi
   * /api/files/complete:
   *   post:
   *     summary: 파일 업로드 완료 처리
   *     description: 업로드된 파일을 검증하고 DB에 확정 저장한다.
   *     tags: [File]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [objectKey]
   *             properties:
   *               objectKey:
   *                 type: string
   *                 example: dev/upload/temp/uuid.pdf
   *     responses:
   *       200:
   *         description: 업로드 확정 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *             example:
   *               resultType: SUCCESS
   *               error: null
   *               success:
   *                 uploadedFileId: "10"
   *                 conversionJobId: "22"
   *                 status: queued
   *       400:
   *         description: 파일 업로드 검증 실패
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *             example:
   *               resultType: FAILURE
   *               error:
   *                 errorCode: F001
   *                 reason: 파일 업로드 검증 실패
   *                 data: null
   *               success: null
   */

  try {
    const result = await completeFileUpload(req.body);
    return success(res, result);
  } catch (e) {
    next(e);
  }
}
