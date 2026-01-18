import {
  slideListResponseDTO,
  slideResponseDTO,
  slideDetailResponseDTO,
} from "../dtos/slide.dto.js";
import {
  processGetSlideDetail,
  processGetSlides,
  processPatchSlideTitle,
} from "../services/slide.service.js";

/**
 * @swagger
 * /presentations/{projectId}/slides:
 *   get:
 *     summary: 슬라이드 목록 조회
 *     description: 특정 프로젝트에 속한 슬라이드 목록을 조회합니다.
 *     tags: [Slide]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           example: "123"
 *         description: 슬라이드 목록을 조회할 프로젝트 ID
 *     responses:
 *       200:
 *         description: 슬라이드 목록 조회 성공
 *         content:
 *           application/json:
 *             example:
 *               resultType: "SUCCESS"
 *               error: null
 *               success:
 *                 - slideId: "1"
 *                   projectId: "123"
 *                   title: "첫 번째 슬라이드"
 *                   slideNum: 1
 *                   imageUrl: "https://storage.googleapis.com/..."
 *                   createdAt: "2026-01-16T10:00:00.000Z"
 *                   updatedAt: "2026-01-16T10:10:00.000Z"
 *                 - slideId: "2"
 *                   projectId: "123"
 *                   title: "두 번째 슬라이드"
 *                   slideNum: 2
 *                   imageUrl: "https://storage.googleapis.com/..."
 *                   createdAt: "2026-01-16T10:01:00.000Z"
 *                   updatedAt: "2026-01-16T10:11:00.000Z"
 *       404:
 *         description: 프로젝트를 찾을 수 없음 (P001)
 *         content:
 *           application/json:
 *             example:
 *               resultType: "FAILURE"
 *               error:
 *                 errorCode: "P001"
 *                 reason: "해당 프로젝트를 찾을 수 없습니다."
 *               success: null
 */
export const handleGetSlides = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const slides = await processGetSlides(projectId, userId);
    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: slideListResponseDTO(slides),
    });
  } catch (error) {
    next(error);
  }
};
/**
 * @swagger
 * /presentations/slides/{slideId}:
 *   patch:
 *     summary: 슬라이드 제목 수정
 *     description: 특정 슬라이드의 제목을 수정합니다.
 *     tags: [Slide]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slideId
 *         required: true
 *         schema:
 *           type: string
 *           example: "1"
 *         description: 제목을 수정할 슬라이드 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "수정된 슬라이드 제목"
 *     responses:
 *       200:
 *         description: 슬라이드 제목 수정 성공
 *         content:
 *           application/json:
 *             example:
 *               resultType: "SUCCESS"
 *               error: null
 *               success:
 *                 slideId: "1"
 *                 title: "수정된 슬라이드 제목"
 *                 slideNum: 1
 *                 imageUrl: "https://storage.googleapis.com/..."
 *                 updatedAt: "2026-01-16T11:00:00.000Z"
 *       403:
 *         description: 슬라이드에 대한 접근 권한 없음 (S002)
 *         content:
 *           application/json:
 *             example:
 *               resultType: "FAILURE"
 *               error:
 *                 errorCode: "S002"
 *                 reason: "이 슬라이드에 접근할 권한이 없습니다."
 *               success: null
 *       404:
 *         description: 슬라이드를 찾을 수 없음 (S001)
 *         content:
 *           application/json:
 *             example:
 *               resultType: "FAILURE"
 *               error:
 *                 errorCode: "S001"
 *                 reason: "해당 슬라이드를 찾을 수 없습니다"
 *               success: null
 */
export const handlePatchSlideTitle = async (req, res, next) => {
  try {
    const { slideId } = req.params;
    const { title } = req.body;
    const userId = req.user.id;

    const updatedSlide = await processPatchSlideTitle(slideId, userId, title);

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: slideResponseDTO(updatedSlide),
    });
  } catch (error) {
    next(error);
  }
};
/**
 * @swagger
 * /presentations/slides/{slideId}:
 *   get:
 *     summary: 슬라이드 상세 조회
 *     description: 특정 슬라이드의 상세 정보와 이전/다음 슬라이드 ID를 조회합니다.
 *     tags: [Slide]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slideId
 *         required: true
 *         schema:
 *           type: string
 *           example: "1"
 *         description: 상세 정보를 조회할 슬라이드 ID
 *     responses:
 *       200:
 *         description: 슬라이드 상세 조회 성공
 *         content:
 *           application/json:
 *             example:
 *               resultType: "SUCCESS"
 *               error: null
 *               success:
 *                 slideId: "1"
 *                 projectId: "123"
 *                 title: "첫 번째 슬라이드"
 *                 slideNum: 1
 *                 imageUrl: "https://storage.googleapis.com/..."
 *                 prevSlideId: null
 *                 nextSlideId: "2"
 *                 updatedAt: "2026-01-16T10:10:00.000Z"
 *       403:
 *         description: 슬라이드에 대한 접근 권한 없음 (S002)
 *         content:
 *           application/json:
 *             example:
 *               resultType: "FAILURE"
 *               error:
 *                 errorCode: "S002"
 *                 reason: "이 슬라이드에 접근할 권한이 없습니다."
 *               success: null
 *       404:
 *         description: 슬라이드를 찾을 수 없음 (S001)
 *         content:
 *           application/json:
 *             example:
 *               resultType: "FAILURE"
 *               error:
 *                 errorCode: "S001"
 *                 reason: "해당 슬라이드를 찾을 수 없습니다"
 *               success: null
 */
export const handleGetSlideDetail = async (req, res, next) => {
  try {
    const { slideId } = req.params;
    const userId = req.user.id;

    const { slide, prevId, nextId } = await processGetSlideDetail(slideId, userId);

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: slideDetailResponseDTO(slide, prevId, nextId),
    });
  } catch (error) {
    next(error);
  }
};
