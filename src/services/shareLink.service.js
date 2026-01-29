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
  getVideoList,
  incrementViewCount,
} from "../repositories/shareLink.repository.js";
import { v4 as uuidv4 } from "uuid";

const SCOPE_VIDEO = "slides_script_video";

export const processCreateShareLink = async (projectId, shareData) => {
  const { scope, videoId } = shareData;

  if (scope === SCOPE_VIDEO) {
    if (!videoId) {
      throw new VideoIdRequiredError();
    }
    const video = await findVideoInProject(projectId, videoId); // 공유 가능한 비디오가 1개 이상 존재하는지 검색
    if (!video) {
      throw new VideoNotFoundError();
    }
  }

  const shareToken = uuidv4(); // 공유 링크에 사용할 토큰

  // 기본 만료일 : 7일
  const defaultExpiredAt = new Date();
  defaultExpiredAt.setDate(defaultExpiredAt.getDate() + 7);

  const newLink = await createShareLink({
    projectId,
    videoId: scope === SCOPE_VIDEO ? videoId : null,
    scope,
    shareToken,
    expiredAt: shareData.expiredAt || defaultExpiredAt,
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
  return await getShareLinkList(projectId);
};

export const processGetVideoList = async (projectId) => {
  return await getVideoList(projectId);
};
