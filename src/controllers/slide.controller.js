import { slideListResponseDTO } from "../dtos/slide.dto.js";
import { processGetSlides } from "../services/slide.service.js";

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
