import { toPublicStorageUrl } from "../utils/storageUrl.util.js";

export const shareLinkResponseDTO = (link) => {
  const DEFAULT_PROJECT_TITLE = "발표 자료";
  return {
    projectId: link.projectId.toString(),
    scope: link.scope,
    shareToken: link.shareToken,
    shareUrl: link.shareUrl,

    sharedContentSummary: {
      scope: link.scope,
      projectTitle: link.project?.title || DEFAULT_PROJECT_TITLE,
      videoTitle: link.video?.title || null,
      videoCreatedAt: link.video?.createdAt || null,
      thumbnailUrl: toPublicStorageUrl(link.video?.thumbnailUrl || null),
    },
    createdAt: link.createdAt,
  };
};

export const getShareLinkResponseDTO = (data) => {
  const { scope, content, shareLink } = data;

  return {
    message: "공유된 프로젝트에 접속했습니다.",

    sessionInfo: {
      sessionId: data.sessionId,
      tokens: data.tokens,
    },
    shareInfo: {
      shareToken: shareLink.shareToken,
      scope: scope,
      createdAt: shareLink.createdAt,
    },
    projectContent: {
      title: content.title,
      slides: content.slides,
      video: content.video || null,
      comments: content.comments.map((c) => ({
        commentId: c.id.toString(),
        content: c.content,
        writer: c.user?.name || "익명",
        targetType: c.targetType,
        targetId: c.targetId.toString(),
        timestampMs: c.timestampMs,
        createdAt: c.createdAt,
      })),
    },
  };
};

export const GetShareLinkListResponseDTO = (links) => {
  return links.map((link) => ({
    scope: link.scope,
    shareToken: link.shareToken,
    isActive: link.isActive,
    viewCount: link.viewCount,
    videoTitle: link.video?.title || null,
    createdAt: link.createdAt,
  }));
};

export const getVideoListResponseDTO = (videos) => {
  return videos.map((video) => ({
    ...video,
    id: video.id.toString(),
    thumbnailUrl: toPublicStorageUrl(video.thumbnailUrl),
  }));
};
