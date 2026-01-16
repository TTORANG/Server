import { slideListResponseDTO, slideResponseDTO } from "../dtos/slide.dto.js";
import {
  processGetSlideDetail,
  processGetSlides,
  processPatchSlideTitle,
} from "../services/slide.service.js";
import { success } from "../utils/response.util.js";

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
