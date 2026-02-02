import {
  createProjectResponseDTO,
  projectListResponseDTO,
  projectResponseDTO,
} from "../dtos/project.dto.js";
import {
  processCreateProject,
  processDeleteProject,
  processGetProjectList,
  processUpdateProjectName,
} from "../services/project.service.js";

/**
 * @swagger
 * /presentations:
 *   post:
 *     summary: 새 프로젝트 생성
 *     description: 제목과 업로드된 파일 ID를 받아 새 프로젝트를 생성하고, GCP Cloud Tasks를 통해 변환 작업을 큐에 등록합니다.
 *     tags: [Presentation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "기말고사 발표 자료"
 *               uploadedFileId:
 *                 type: string
 *                 example: "15"
 *     responses:
 *       201:
 *         description: 프로젝트 생성 성공
 *         content:
 *           application/json:
 *             example:
 *               resultType: "SUCCESS"
 *               error: null
 *               success:
 *                 message: "프로젝트가 생성되었습니다. 변환이 시작됩니다."
 *                 projectId: "123"
 *                 title: "기말고사 발표 자료"
 *                 createdAt: "2026-01-15T10:00:00.000Z"
 *       400:
 *         description: 연결된 파일 정보 오류 (P002)
 *         content:
 *           application/json:
 *             example:
 *               resultType: "FAILURE"
 *               error:
 *                 errorCode: "P002"
 *                 reason: "연결된 파일 정보가 올바르지 않습니다"
 *                 data:
 *                   uploadedFileId: "15"
 *               success: null
 *       404:
 *         description: 프로젝트(파일)를 찾을 수 없음 (P001)
 *         content:
 *           application/json:
 *             example:
 *               resultType: "FAILURE"
 *               error:
 *                 errorCode: "P001"
 *                 reason: "해당 프로젝트를 찾을 수 없습니다."
 *                 data: null
 *               success: null
 */
export const handleCreateProject = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const project = await processCreateProject(userId, req.body);

    res.status(201).json({
      resultType: "SUCCESS",
      error: null,
      success: createProjectResponseDTO(project),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /presentations/{projectId}:
 *   patch:
 *     summary: 프로젝트 제목 수정
 *     description: 특정 프로젝트의 제목을 변경합니다.
 *     tags: [Presentation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           example: "123"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "수정된 발표 제목"
 *     responses:
 *       200:
 *         description: 수정 성공
 *         content:
 *           application/json:
 *             example:
 *               resultType: "SUCCESS"
 *               error: null
 *               success:
 *                 projectId: "123"
 *                 title: "수정된 발표 제목"
 *                 updatedAt: "2026-01-15T11:00:00.000Z"
 *       404:
 *         description: 프로젝트를 찾을 수 없음 (P001)
 *         content:
 *           application/json:
 *             example:
 *               resultType: "FAILURE"
 *               error:
 *                 errorCode: "P001"
 *                 reason: "해당 프로젝트를 찾을 수 없습니다."
 *                 data: null
 *               success: null
 */
export const handleUpdateProjectName = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { title } = req.body;
    const userId = req.user.id;
    const project = await processUpdateProjectName(projectId, userId, title);

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: projectResponseDTO(project),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /presentations/{projectId}:
 *   delete:
 *     summary: 프로젝트 삭제 (Soft Delete)
 *     description: 특정 프로젝트의 isDeleted 플래그를 true로 변경합니다.
 *     tags: [Presentation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           example: "123"
 *     responses:
 *       200:
 *         description: 삭제 성공
 *         content:
 *           application/json:
 *             example:
 *               resultType: "SUCCESS"
 *               error: null
 *               success:
 *                 message: "프로젝트가 성공적으로 삭제되었습니다."
 *       404:
 *         description: 프로젝트를 찾을 수 없음 (P001)
 *         content:
 *           application/json:
 *             example:
 *               resultType: "FAILURE"
 *               error:
 *                 errorCode: "P001"
 *                 reason: "해당 프로젝트를 찾을 수 없습니다."
 *                 data: null
 *               success: null
 */
export const handleDeleteProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    await processDeleteProject(projectId, userId);

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: { message: "프로젝트가 성공적으로 삭제되었습니다." },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /presentations:
 *   get:
 *     summary: 프로젝트 목록 조회 및 검색
 *     description: 사용자의 프로젝트 목록을 페이징하여 조회합니다. 검색어, 최대 재생 시간, 정렬 조건을 지원합니다.
 *     tags: [Presentation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 프로젝트 제목 검색어 (2자 이상)
 *       - in: query
 *         name: maxDuration
 *         schema:
 *           type: integer
 *         description: 최대 재생 시간 필터 (초 단위)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [latest, name]
 *           default: latest
 *     responses:
 *       200:
 *         description: 조회 성공 (데이터가 없어도 SUCCESS이며 빈 배열 반환)
 *         content:
 *           application/json:
 *             example:
 *               resultType: "SUCCESS"
 *               error: null
 *               success:
 *                 presentations:
 *                   - projectId: "123"
 *                     title: "기말고사 발표 자료"
 *                     thumbnailUrl: "https://storage.googleapis.com/..."
 *                     slideCount: 10
 *                     reactionCount: 25
 *                     viewCount: 150
 *                     feedbackCount: 5
 *                     durationSeconds: 180
 *                     createdAt: "2026-01-15T10:00:00.000Z"
 *                     updatedAt: "2026-01-15T11:00:00.000Z"
 *                 total: 1
 *                 page: 1
 *                 limit: 20
 *                 totalPages: 1
 *       400:
 *         description: 페이지 번호 오류(P003) 또는 검색어 짧음(P004)
 *         content:
 *           application/json:
 *             examples:
 *               InvalidPage:
 *                 summary: 페이지 번호 오류 (P003)
 *                 value:
 *                   resultType: "FAILURE"
 *                   error:
 *                     errorCode: "P003"
 *                     reason: "페이지 번호는 1보다 커야 합니다."
 *                     data: null
 *                   success: null
 *               SearchQueryTooShort:
 *                 summary: 검색어 짧음 (P004)
 *                 value:
 *                   resultType: "FAILURE"
 *                   error:
 *                     errorCode: "P004"
 *                     reason: "검색어는 최소 2글자 이상이어야 합니다."
 *                     data: null
 *                   success: null
 */
export const handleGetProjectList = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await processGetProjectList(userId, req.query);

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: projectListResponseDTO(result.projects, result.total, result.page, result.limit),
    });
  } catch (error) {
    next(error);
  }
};
