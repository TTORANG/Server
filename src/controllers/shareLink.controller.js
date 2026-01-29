import { shareLinkResponseDTO } from "../dtos/shareLink.dto.js";
import { processCreateShareLink } from "../services/shareLink.service.js";
export const handleCreateShareLink = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const shareData = req.body;

    const shareLink = await processCreateShareLink(projectId, shareData);
    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: shareLinkResponseDTO(shareLink),
    });
  } catch (error) {
    next(error);
  }
};
