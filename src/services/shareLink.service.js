import {
  ShareLinkExpiredError,
  ShareLinkNotActiveError,
  VideoIdRequiredError,
  VideoNotFoundError,
} from "../errors/shareLink.error.js";
import {
  createShareLink,
  findShareLinkWithContent,
  findVideoInProject,
  getShareLinkList,
  incrementViewCount,
} from "../repositories/shareLink.repository.js";
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

export const processGetShareContent = async (token) => {
  const shareLink = await findShareLinkWithContent(token);

  // 링크 존재여부 확인
  if (!shareLink || !shareLink.isActive) {
    throw new ShareLinkNotActiveError();
  }

  // 링크 만료일 확인
  if (shareLink.expiredAt && new Date() > shareLink.expiredAt) {
    throw new ShareLinkExpiredError();
  }

  incrementViewCount(shareLink.id);

  const { scope, project, video } = shareLink;
  const content = {
    title: project.title,
    slides: project.slides.map((slide) => ({
      slideId: slide.id.toString(),
      slideNum: slide.slideNum,
      imageUrl: slide.assets[0]?.url || null,
      scriptText: slide.script?.scriptText || "",
    })),
  };
  const SCOPE_VIDEO = "slides_script_video";

  if (scope === SCOPE_VIDEO && video) {
    content.video = {
      videoId: video.id.toString(),
      videoUrl: video.sourceUrl,
      thumbnailUrl: video.thumbnailUrl,
    };
  }

  return { scope, content, shareLink };
};

export const processGetShareLinkList = async (projectId) => {
  const links = await getShareLinkList(projectId);

  return links;
};
