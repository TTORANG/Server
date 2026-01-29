import { VideoIdRequiredError, VideoNotFoundError } from "../errors/shareLink.error.js";
import { createShareLink, findVideoInProject } from "../repositories/shareLink.repository.js";
import { v4 as uuidv4 } from "uuid";
export const processCreateShareLink = async (projectId, shareDate) => {
  const { scope, videoId } = shareDate;
  const SCOPE_VIDEO = "slides_script_video";

  if (scope === SCOPE_VIDEO) {
    if (!videoId) {
      throw new VideoNotFoundError();
    }
    const video = await findVideoInProject(projectId, videoId);
    if (!video) {
      throw new VideoIdRequiredError();
    }
  }

  const shareToken = uuidv4();

  const newLink = await createShareLink({
    projectId,
    videoId: scope === SCOPE_VIDEO ? videoId : null,
    scope,
    shareToken,
  });

  const baseUrl = process.env.BASE_URL || process.env.LOCAL_URL;
  const shareUrl = `${baseUrl}/share/${shareToken}`;

  return {
    ...newLink,
    shareUrl,
  };
};
