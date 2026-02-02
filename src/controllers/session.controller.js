import { projectResponseDTO } from "../dtos/project.dto.js";
import { anonymousSessionResponseDTO, mergeResultResponseDTO } from "../dtos/session.dto.js";
import { processCreateProject, processUpdateProjectName } from "../services/project.service.js";
import { issueAnonymousSession, mergeAnonymousData } from "../services/session.service.js";

/**
 * @swagger
 * /session/anonymous:
 *   post:
 *     summary: 익명 세션 생성
 *     description: 익명 사용자를 위한 세션과 임시 유저를 생성하고, 익명 전용 JWT 토큰을 발급합니다.
 *     tags: [Session]
 *     responses:
 *       201:
 *         description: 익명 세션 생성 성공
 *         content:
 *           application/json:
 *             example:
 *               resultType: "SUCCESS"
 *               error: null
 *               success:
 *                 message: "익명 세션이 성공적으로 발급되었습니다."
 *                 sessionId: "550e8400-e29b-41d4-a716-446655440000"
 *                 accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 expiresIn: "7d"
 *                 expiresAt: "2026-01-22T10:00:00.000Z"
 */
export const handleCreateAnonymousSession = async (req, res, next) => {
  try {
    const { sessionId, tokens } = await issueAnonymousSession();

    res.status(201).json({
      resultType: "SUCCESS",
      error: null,
      success: anonymousSessionResponseDTO(sessionId, tokens),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /presentations/anonymous:
 *   post:
 *     summary: 익명 프로젝트 생성
 *     description: 익명 세션으로 로그인한 사용자의 프로젝트를 생성합니다. 생성된 프로젝트는 나중에 실제 계정으로 병합될 수 있습니다.
 *     tags: [Session]
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
 *                 example: "익명 발표 자료"
 *               uploadedFileId:
 *                 type: string
 *                 example: "15"
 *     responses:
 *       201:
 *         description: 익명 프로젝트 생성 성공
 *         content:
 *           application/json:
 *             example:
 *               resultType: "SUCCESS"
 *               error: null
 *               success:
 *                 projectId: "123"
 *                 title: "익명 발표 자료"
 *                 updatedAt: "2026-01-15T10:00:00.000Z"
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
export const handleCreateAnonymousProject = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const project = await processCreateProject(userId, req.body);

    res.status(201).json({
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
 * /presentations/anonymous/{projectId}:
 *   patch:
 *     summary: 익명 프로젝트 제목 수정
 *     description: 익명 세션으로 생성된 특정 프로젝트의 제목을 변경합니다.
 *     tags: [Session]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           example: "123"
 *         description: 수정할 프로젝트 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "수정된 익명 발표 제목"
 *     responses:
 *       200:
 *         description: 익명 프로젝트 수정 성공
 *         content:
 *           application/json:
 *             example:
 *               resultType: "SUCCESS"
 *               error: null
 *               success:
 *                 projectId: "123"
 *                 title: "수정된 익명 발표 제목"
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
export const handleUpdateAnonymousProject = async (req, res, next) => {
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
 * /session/merge:
 *   post:
 *     summary: 익명 세션 병합
 *     description: 익명 세션으로 생성된 프로젝트와 데이터를 현재 로그인한 사용자 계정으로 병합합니다.
 *     tags: [Session]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               anonymousSessionId:
 *                 type: string
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *                 description: 병합할 익명 세션 ID
 *     responses:
 *       200:
 *         description: 익명 데이터 병합 성공
 *         content:
 *           application/json:
 *             example:
 *               resultType: "SUCCESS"
 *               error: null
 *               success:
 *                 message: "데이터 병합이 완료되었습니다."
 *                 mergedProjectsCount: 3
 *       400:
 *         description: 병합 가능한 데이터가 없거나 요청이 잘못된 경우
 *         content:
 *           application/json:
 *             examples:
 *               NoDataToMerge:
 *                 summary: 병합할 데이터가 없음 (S002)
 *                 value:
 *                   resultType: "FAILURE"
 *                   error:
 *                     errorCode: "S002"
 *                     reason: "병합할 익명 데이터가 존재하지 않습니다."
 *                     data:
 *                       sessionId: "eyJh_XYAUWw..."
 *                   success: null
 *       404:
 *         description: 익명 세션을 찾을 수 없음 (S001)
 *         content:
 *           application/json:
 *             example:
 *               resultType: "FAILURE"
 *               error:
 *                 errorCode: "S001"
 *                 reason: "해당 세션을 찾을 수 없거나 이미 만료되었습니다."
 *                 data:
 *                   sessionId: "eyJh_XYAUWw..."
 *               success: null
 */
export const handleMergeSession = async (req, res, next) => {
  try {
    const { anonymousSessionId } = req.body;
    const userId = req.user.id;
    const mergedProjects = await mergeAnonymousData(anonymousSessionId, userId);

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: mergeResultResponseDTO(mergedProjects),
    });
  } catch (error) {
    next(error);
  }
};
