import { InvalidPageError } from "../errors/project.error.js";
import {
  ProjectDeletedError,
  ShareLinkExpiredError,
  ShareLinkNotActiveError,
  VideoIdRequiredError,
  VideoNotFoundError,
} from "../errors/shareLink.error.js";
import { createPageView } from "../repositories/analytics.repository.js";
import {
  createShareLink,
  findExistingLink,
  findProjectById,
  findShareLinkWithContent,
  findVideoInProject,
  getShareLinkList,
  getVideoList,
  incrementViewCount,
} from "../repositories/shareLink.repository.js";
import { v4 as uuidv4 } from "uuid";
import { issueAnonymousSession } from "./session.service.js";
import { prisma } from "../db.config.js";
import { toPublicStorageUrl } from "../utils/storageUrl.util.js";

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

  const existingLink = await findExistingLink(projectId, scope, videoId);

  const baseUrl = process.env.SERVER_URL || process.env.LOCAL_URL;

  if (existingLink) {
    return {
      ...existingLink,
      shareUrl: `${baseUrl}/share/${existingLink.shareToken}`,
    };
  }

  const shareToken = uuidv4(); // 공유 링크에 사용할 토큰

  // 기본 만료일 : 7일
  const defaultExpiredAt = new Date();
  defaultExpiredAt.setDate(defaultExpiredAt.getDate() + 7);

  const newLink = await createShareLink({
    projectId,
    videoId: videoId ? videoId : null,
    scope,
    shareToken,
    expiredAt: shareData.expiredAt || defaultExpiredAt,
  });

  const shareUrl = `${baseUrl}/share/${shareToken}`;

  return {
    ...newLink,
    shareUrl,
  };
};

export const processGetShareContent = async (shareToken, sessionId = null) => {
  const shareLink = await findShareLinkWithContent(shareToken);

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

  let currentSessionId = sessionId;
  let newTokens = null;

  if (currentSessionId) {
    const sessionExists = await prisma.session.findUnique({
      where: { id: currentSessionId },
    });

    if (!sessionExists) {
      currentSessionId = null;
    }
  }

  if (!currentSessionId) {
    // 세션이 없으면 새로 발급하고 변수에 할당
    const sessionData = await issueAnonymousSession();
    currentSessionId = sessionData.sessionId;
    newTokens = sessionData.tokens; // 새로 만든 토큰은 클라이언트에 전달해야 함
  }

  await createPageView({
    projectId: shareLink.projectId,
    sessionId: currentSessionId,
  });

  const { scope, project, video, videoId } = shareLink;

  const slides = project.slides.map((slide) => {
    const durationInfo = slide.slideDurations?.find((sd) => String(sd.videoId) === String(videoId));

    return {
      slideId: slide.id.toString(),
      slideNum: Number(slide.slideNum),
      imageUrl: toPublicStorageUrl(slide.assets[0]?.url || null),
      scriptText: slide.script?.scriptText || "",
      timestampMs: durationInfo ? durationInfo.totalDurationMs : null,
    };
  });

  const content = {
    title: project.title,
    slides: slides,
  };

  if (scope === SCOPE_VIDEO && video) {
    content.video = {
      videoId: video.id.toString(),
      videoUrl: toPublicStorageUrl(video.sourceUrl),
      thumbnailUrl: toPublicStorageUrl(video.thumbnailUrl),
    };
  }

  return {
    scope,
    content,
    shareLink,
    sessionId: currentSessionId,
    tokens: newTokens,
  };
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
