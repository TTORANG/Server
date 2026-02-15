import { InvalidPageError } from "../errors/project.error.js";
import {
  InvalidShareTokenError,
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
  findShareLinkWithComments,
  findShareLinkWithContent,
  findVideoInProject,
  getShareLinkList,
  getVideoList,
  incrementViewCount,
} from "../repositories/shareLink.repository.js";
import { v4 as uuidv4 } from "uuid";
import { issueAnonymousSession } from "./session.service.js";
import {
  findSessionById,
  findSessionByIdWithUser,
  findSessionUserIdById,
} from "../repositories/session.repository.js";
import { toPublicStorageUrl } from "../utils/storageUrl.util.js";

const SCOPE_VIDEO = "slides_script_video";

const resolveUserIdFromSessionId = async (sessionId) => {
  if (!sessionId) return null;

  const session = await findSessionUserIdById(sessionId);

  return session?.userId ?? null;
};

const validateShareLinkAccess = (shareLink) => {
  // 링크 존재여부 확인
  if (!shareLink || !shareLink.isActive) {
    throw new ShareLinkNotActiveError();
  }

  // 프로젝트 삭제여부 확인
  if (!shareLink.project || shareLink.project.isDeleted) {
    throw new ProjectDeletedError();
  }

  // 링크 만료일 확인
  if (shareLink.expiredAt && new Date() > shareLink.expiredAt) {
    throw new ShareLinkExpiredError();
  }
};

const ensureShareTokenIsNotSessionId = async (shareToken, shareLink) => {
  if (shareLink) {
    return;
  }

  if (!shareToken || typeof shareToken !== "string") {
    return;
  }

  const session = await findSessionById(shareToken);

  if (session) {
    throw new InvalidShareTokenError();
  }
};

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

  const baseUrl = process.env.FRONTEND_URL || process.env.LOCAL_URL;

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
  await ensureShareTokenIsNotSessionId(shareToken, shareLink);
  validateShareLinkAccess(shareLink);

  await incrementViewCount(shareLink.id);

  let currentSessionId = sessionId;
  let newTokens = null;
  let sessionRecord = null;

  if (currentSessionId) {
    sessionRecord = await findSessionByIdWithUser(currentSessionId);

    if (!sessionRecord) {
      currentSessionId = null;
    }
  }

  if (!currentSessionId) {
    // 세션이 없으면 새로 발급하고 변수에 할당
    const sessionData = await issueAnonymousSession();
    currentSessionId = sessionData.sessionId;
    newTokens = sessionData.tokens; // 새로 만든 토큰은 클라이언트에 전달해야 함
    sessionRecord = sessionData.session;
  }

  const sessionName = sessionRecord?.user
    ? sessionRecord.isAnonymous
      ? sessionRecord.user.nickName || sessionRecord.user.name
      : sessionRecord.user.name
    : null;

  await createPageView({
    projectId: shareLink.projectId,
    sessionId: currentSessionId,
  });

  const { scope, project, video, videoId } = shareLink;
  const publisherName = project?.user?.nickName || project?.user?.name || "익명 사용자";

  const filteredComments = project.comments || [];

  const slides = (project.slides || []).map((slide) => {
    const durationInfo = slide.slideDurations?.find((sd) => String(sd.videoId) === String(videoId));

    return {
      slideId: slide.id.toString(),
      slideNum: Number(slide.slideNum),
      title: slide.title || null,
      imageUrl: toPublicStorageUrl(slide.assets[0]?.url || null),
      scriptText: slide.script?.scriptText || "",
      timestampMs: durationInfo ? durationInfo.totalDurationMs : null,
    };
  });

  const content = {
    title: project.title,
    slides: slides,
    comments: filteredComments,
  };

  if (scope === SCOPE_VIDEO && video) {
    content.video = {
      videoId: video.id.toString(),
      hlsMasterUrl: toPublicStorageUrl(video.hlsMasterUrl ?? video.sourceUrl),
      thumbnailUrl: toPublicStorageUrl(video.thumbnailUrl),
    };
  }

  return {
    scope,
    content,
    shareLink,
    publisherName,
    sessionId: currentSessionId,
    tokens: newTokens,
    sessionName,
    currentUserId: sessionRecord?.userId ?? null,
  };
};

export const processGetShareComments = async (shareToken, sessionId = null) => {
  const shareLink = await findShareLinkWithComments(shareToken);
  await ensureShareTokenIsNotSessionId(shareToken, shareLink);
  validateShareLinkAccess(shareLink);

  const currentUserId = await resolveUserIdFromSessionId(sessionId);

  return {
    comments: shareLink.project.comments || [],
    currentUserId,
  };
};

export const processGetShareLinkList = async (projectId) => {
  return await getShareLinkList(projectId);
};

export const processGetVideoList = async (projectId, page, pageSize) => {
  // 1. page 보정: 숫자가 아니거나(NaN), 0, 음수라면 1로 고정
  const p = Math.max(1, parseInt(page) || 1);

  // 2. pageSize 보정: 숫자가 아니면 10, 그 외엔 최소 1 ~ 최대 50 사이로 제한
  const pSize = Math.max(1, Math.min(parseInt(pageSize) || 10, 50));

  // 3. 데이터 조회 및 null 방어적 처리
  const { totalCount, videos } = await getVideoList(projectId, p, pSize);

  const safeVideos = videos || [];
  const safeTotalCount = totalCount || 0;

  // 4. 다음 페이지 여부 계산
  const hasNext = safeTotalCount > p * pSize;

  return {
    videos: safeVideos,
    totalCount: safeTotalCount,
    hasNext,
    currentPage: p,
  };
};
