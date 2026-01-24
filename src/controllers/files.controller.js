import { completeFileUpload } from "../services/files.service.js";
import { createUploadUrl } from "../services/gcs.service.js";
import { success } from "../utils/response.util.js";

export async function postUploadUrl(req, res, next) {
  /**
   * @swagger
   * /files/upload-url:
   *   post:
   *     summary: 파일 업로드용 Signed URL 발급
   *     description: |
   *       GCS에 파일을 직접 업로드할 수 있는 Signed URL을 발급합니다.
   *
   *       이 API는 파일을 업로드하지 않습니다.
   *       클라이언트는 아래 순서대로 업로드를 완료해야 합니다.
   *
   *       업로드 절차
   *       1) /files/upload-url 호출 (Signed URL 발급)
   *          - 업로드할 파일의 contentType, size를 서버에 전달합니다.
   *          - 응답으로 uploadUrl과 objectKey를 받습니다.
   *
   *       2) uploadUrl로 PUT 업로드 (GCS로 직접 업로드)
   *          - Method: PUT
   *          - URL: uploadUrl (서버가 발급한 Signed URL)
   *          - Header: Content-Type은 1)에서 보낸 contentType과 같아야 합니다.
   *          - Body: 파일 바이너리(raw). multipart/form-data를 사용하지 않습니다.
   *
   *          예시(curl)
   *          ```bash
   *          curl -X PUT \
   *            -H "Content-Type: application/pdf" \
   *            --data-binary @sample.pdf \
   *            "https://storage.googleapis.com/..."
   *          ```
   *
   *       3) /files/complete 호출 (업로드 완료 확정)
   *          - PUT 업로드가 성공한 뒤 objectKey를 전달합니다.
   *          - 서버가 GCS 메타데이터(size, contentType)를 다시 확인하고
   *            DB에 업로드 정보를 저장합니다.
   *
   *       참고
   *       - uploadUrl은 expiresAt 이후 만료됩니다. 만료되면 1)부터 다시 진행해야 합니다.
   *       - Content-Type이 다르면 업로드가 실패하거나, complete 단계에서 검증에 실패할 수 있습니다.
   *     tags: [File]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/FileUploadUrlRequest'
   *     responses:
   *       200:
   *         description: Signed URL 발급 성공
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/FileUploadUrlResponse'
   *       400:
   *         description: 요청 값 검증 실패(파일 형식/크기 등)
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
   * @swagger
   * /files/complete:
   *   post:
   *     summary: 파일 업로드 완료 처리
   *     description: |
   *       Signed URL로 업로드된 파일을 검증하고 업로드를 최종 확정합니다.
   *
   *       호출 시점
   *       - uploadUrl로 PUT 업로드가 성공한 이후에 호출합니다.
   *
   *       처리 내용
   *       - objectKey로 GCS 파일 메타데이터를 조회합니다.
   *       - contentType, size를 다시 검증합니다.
   *       - 검증에 성공하면 업로드 정보를 DB에 저장합니다.
   *
   *       실패 예시
   *       - objectKey가 없거나 잘못된 경로인 경우
   *       - 허용되지 않은 contentType인 경우
   *       - 파일 크기가 제한을 초과한 경우
   *     tags: [File]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/FileUploadCompleteRequest'
   *     responses:
   *       200:
   *         description: 업로드 확정 성공
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/FileUploadCompleteResponse'
   *       400:
   *         description: 업로드 검증 실패
   */

  try {
    const result = await completeFileUpload(req.body);
    return success(res, result);
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
