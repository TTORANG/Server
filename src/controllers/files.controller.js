import {
  completePresentationUpload,
  createPresentationUploadUrl,
} from "../services/files.service.js";

/**
 * @swagger
 * /files/upload-url:
 *   post:
 *     summary: 발표자료 업로드용 Signed URL 발급
 *     tags: [File]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [purpose, contentType, size, originalFilename]
 *             properties:
 *               purpose:
 *                 type: string
 *                 enum: [presentation_file]
 *               contentType:
 *                 type: string
 *               size:
 *                 type: integer
 *               originalFilename:
 *                 type: string
 *               title:
 *                 type: string
 *     responses:
 *       201:
 *         description: Signed URL 발급 성공
 */
export async function postCreateUploadUrl(req, res, next) {
  try {
    const userId = req.user.id;
    const { purpose, contentType, size, originalFilename, title } = req.body ?? {};

    const result = await createPresentationUploadUrl({
      userId,
      purpose,
      contentType,
      size,
      originalFilename,
      title,
    });

    return res.status(201).json({
      resultType: "SUCCESS",
      error: null,
      success: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /files/upload-complete:
 *   post:
 *     summary: 발표자료 업로드 완료 확정
 *     tags: [File]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [objectKey, uploadToken]
 *             properties:
 *               objectKey:
 *                 type: string
 *               uploadToken:
 *                 type: string
 *     responses:
 *       201:
 *         description: 프로젝트 생성 및 변환 파이프라인 시작
 */
export async function postCompleteUpload(req, res, next) {
  try {
    const userId = req.user.id;
    const { objectKey, uploadToken } = req.body ?? {};

    const result = await completePresentationUpload({
      userId,
      objectKey,
      uploadToken,
    });

    return res.status(201).json({
      resultType: "SUCCESS",
      error: null,
      success: result,
    });
  } catch (error) {
    next(error);
  }
}
