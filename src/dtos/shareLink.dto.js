import { toPublicStorageUrl } from "../utils/storageUrl.util.js";

const shareCommentItemDTO = (comment) => ({
  commentId: comment.id.toString(),
  content: comment.content,
  writer: comment.user?.nickName || "익명",
  targetType: comment.targetType,
  targetId: comment.targetId ? comment.targetId.toString() : null,
  parentId: comment.parentId ? comment.parentId.toString() : null,
  timestampMs: comment.timestampMs,
  createdAt: comment.createdAt,
});

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
      name: data.sessionName,
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
      comments: content.comments.map(shareCommentItemDTO),
    },
  };
};

export const getShareCommentsResponseDTO = (comments) => ({
  comments: comments.map(shareCommentItemDTO),
});

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
