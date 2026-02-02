import { InvalidPageError } from "../errors/project.error.js";
import {
  ProjectDeletedError,
  ShareLinkExpiredError,
  ShareLinkNotActiveError,
  VideoIdRequiredError,
  VideoNotFoundError,
} from "../errors/shareLink.error.js";
import {
  createShareLink,
  findProjectById,
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

  const project = await findProjectById(projectId);

  // 프로젝트 삭제여부 확인
  if (!project || project.isDeleted) {
    throw new ProjectDeletedError();
  }

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

  const baseUrl = process.env.SERVER_URL || process.env.LOCAL_URL;
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

  // 프로젝트 삭제여부 확인
  if (shareLink.project.isDeleted) {
    throw new ProjectDeletedError();
  }

  // 링크 만료일 확인
  if (shareLink.expiredAt && new Date() > shareLink.expiredAt) {
    throw new ShareLinkExpiredError();
  }

  await incrementViewCount(shareLink.id);

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

export const processGetVideoList = async (projectId, page, pageSize) => {
  const p = parseInt(page) || 1;
  const rawSize = parseInt(pageSize) || 10;

  if (p < 1) {
    throw new InvalidPageError();
  }

  // pageSize 유효성 검사 (0 이하 방지 및 최대치 제한)
  if (rawSize < 1) rawSize = 10;
  const pSize = rawSize > 50 ? 50 : rawSize; // 최대 50개 까지만 가져오도록 제한 (서버 부하 방지)

  const { totalCount, videos } = await getVideoList(projectId, p, pSize);

  const hasNext = totalCount > p * pSize;

  return {
    videos,
    totalCount,
    hasNext,
    currentPage: p,
  };
};
