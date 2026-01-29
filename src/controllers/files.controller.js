import {
  // completeFileUpload,
  uploadPresentationAndCreateProject,
} from "../services/files.service.js";
// import { createUploadUrl } from "../services/gcs.service.js";
// import { success } from "../utils/response.util.js";

export async function postUploadPresentationFile(req, res, next) {
  /**
   * @swagger
   * components:
   *   securitySchemes:
   *     bearerAuth:
   *       type: http
   *       scheme: bearer
   *       bearerFormat: JWT
   *
   *   schemas:
   *     ApiResponseBase:
   *       type: object
   *       properties:
   *         resultType:
   *           type: string
   *           enum: [SUCCESS, FAILURE]
   *         error:
   *           type: object
   *           nullable: true
   *         success:
   *           type: object
   *           nullable: true
   *
   *     FileUploadResponse:
   *       allOf:
   *         - $ref: "#/components/schemas/ApiResponseBase"
   *         - type: object
   *           properties:
   *             success:
   *               type: object
   *               nullable: true
   *               properties:
   *                 projectId:
   *                   type: string
   *                   description: 생성된 프로젝트 ID(BigInt → string)
   *                   example: "123"
   *
   * /files/upload:
   *   post:
   *     summary: 파일 업로드 (발표자료/발표영상)
   *     description: >
   *       발표 자료(PPT/PDF) 또는 발표 영상(MP4/WEBM)을 업로드합니다./n
   *       업로드 완료 시 프로젝트가 자동 생성되며, 파일 타입에 따라 변환 파이프라인이 자동으로 시작됩니다.
   *     tags: [File]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - file
   *             properties:
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: pptx / pdf / mp4 / webm
   *               title:
   *                 type: string
   *                 description: 프로젝트 제목(선택)
   *                 example: "테스트 프로젝트"
   *     responses:
   *       200:
   *         description: 업로드 성공 (프로젝트 자동 생성 및 변환 시작)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/FileUploadResponse"
   *             examples:
   *               success:
   *                 value:
   *                   resultType: "SUCCESS"
   *                   error: null
   *                   success:
   *                     projectId: "123"
   *       400:
   *         description: 잘못된 요청 (파일 없음/형식 불일치/용량 초과 등)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ApiResponseBase"
   *             examples:
   *               fileRequired:
   *                 value:
   *                   resultType: "FAILURE"
   *                   error:
   *                     errorCode: "F001"
   *                     reason: "업로드할 파일이 필요합니다."
   *                     data: null
   *                   success: null
   *               invalidType:
   *                 value:
   *                   resultType: "FAILURE"
   *                   error:
   *                     errorCode: "F001"
   *                     reason: "지원하지 않는 파일 형식입니다."
   *                     data:
   *                       contentType: "image/png"
   *                   success: null
   *               tooLarge:
   *                 value:
   *                   resultType: "FAILURE"
   *                   error:
   *                     errorCode: "F001"
   *                     reason: "파일 크기는 최대 50MB입니다."
   *                     data:
   *                       size: 73400321
   *                       max: 52428800
   *                   success: null
   *       401:
   *         description: 인증 실패
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ApiResponseBase"
   *             examples:
   *               unauthorized:
   *                 value:
   *                   resultType: "FAILURE"
   *                   error:
   *                     errorCode: "AUTH_001"
   *                     reason: "UNAUTHORIZED"
   *                     data: null
   *                   success: null
   */

  try {
    const { title } = req.body;
    const userId = req.user.id;

    const result = await uploadPresentationAndCreateProject({
      userId,
      title,
      file: req.file,
    });

    return res.status(201).json({
      resultType: "SUCCESS",
      error: null,
      success: {
        projectId: result.projectId,
      },
    });
  } catch (e) {
    next(e);
  }
}

/**
 * @swagger
 * components:
 *   schemas:
 *
 *     BaseSuccessResponse:
 *       type: object
 *       required:
 *         - resultType
 *         - error
 *         - result
 *       properties:
 *         resultType:
 *           type: string
 *           example: SUCCESS
 *         error:
 *           type: object
 *           nullable: true
 *           example: null
 *         result:
 *           type: object
 *
 *     BaseFailureResponse:
 *       type: object
 *       required:
 *         - resultType
 *         - error
 *         - result
 *       properties:
 *         resultType:
 *           type: string
 *           example: FAILURE
 *         error:
 *           type: object
 *           required:
 *             - errorCode
 *             - reason
 *           properties:
 *             errorCode:
 *               type: string
 *               example: F001
 *             reason:
 *               type: string
 *               example: INVALID_FILE_SIZE
 *             data:
 *               type: object
 *               nullable: true
 *         result:
 *           type: object
 *           nullable: true
 *
 *     FileUploadUrlRequest:
 *       type: object
 *       required:
 *         - purpose
 *         - contentType
 *         - size
 *       properties:
 *         purpose:
 *           type: string
 *           description: 업로드 목적
 *           enum: [presentation_file]
 *           example: presentation_file
 *         contentType:
 *           type: string
 *           description: 업로드할 파일의 MIME 타입
 *           example: application/pdf
 *         size:
 *           type: integer
 *           description: 파일 크기 (bytes)
 *           example: 1048576
 *
 *     FileUploadUrlResult:
 *       type: object
 *       required:
 *         - objectKey
 *         - uploadUrl
 *         - expiresAt
 *       properties:
 *         objectKey:
 *           type: string
 *           description: 업로드된 파일의 GCS object key
 *           example: dev/upload/temp/uuid.pdf
 *         uploadUrl:
 *           type: string
 *           description: PUT 업로드에 사용할 Signed URL
 *           example: https://storage.googleapis.com/...
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           description: Signed URL 만료 시각
 *           example: "2026-01-15T12:00:00.000Z"
 *
 *     FileUploadUrlSuccessResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/BaseSuccessResponse'
 *         - type: object
 *           properties:
 *             result:
 *               $ref: '#/components/schemas/FileUploadUrlResult'
 *
 *     FileUploadCompleteRequest:
 *       type: object
 *       required:
 *         - objectKey
 *       properties:
 *         objectKey:
 *           type: string
 *           description: 업로드 완료된 파일의 object key
 *           example: dev/upload/temp/uuid.pdf
 *
 *     FileUploadCompleteResult:
 *       type: object
 *       required:
 *         - uploadedFileId
 *         - conversionJobId
 *         - status
 *       properties:
 *         uploadedFileId:
 *           type: string
 *           description: 업로드된 파일 ID
 *           example: "10"
 *         conversionJobId:
 *           type: string
 *           description: 생성된 변환 작업 ID
 *           example: "22"
 *         status:
 *           type: string
 *           description: 변환 작업 상태
 *           example: queued
 *
 *     FileUploadCompleteSuccessResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/BaseSuccessResponse'
 *         - type: object
 *           properties:
 *             result:
 *               $ref: '#/components/schemas/FileUploadCompleteResult'
 */
