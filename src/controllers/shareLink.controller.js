import {
  GetShareLinkListResponseDTO,
  getShareLinkResponseDTO,
  shareLinkResponseDTO,
} from "../dtos/shareLink.dto.js";
import {
  processCreateShareLink,
  processGetShareContent,
  processGetShareLinkList,
} from "../services/shareLink.service.js";
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

export const handleGetShareContent = async (req, res, next) => {
  try {
    const { token } = req.params;
    const result = await processGetShareContent(token);

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: getShareLinkResponseDTO(result),
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetShareLinkList = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const result = await processGetShareLinkList(projectId);

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: GetShareLinkListResponseDTO(result),
    });
  } catch (error) {
    next(error);
  }
};
