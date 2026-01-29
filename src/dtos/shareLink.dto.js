export const shareLinkResponseDTO = (link) => {
  return {
    shareId: link.id.toString(),
    projectId: link.projectId.toString(),
    scope: link.scope,
    shareToken: link.shareToken,
    shareUrl: link.shareUrl,

    sharedContentSummary: {
      scope: link.scope,
      videoTitle: link.video?.title || null,
      videoCreatedAt: link.video?.createdAt || null,
    },
    createdAt: link.createdAt,
  };
};

export const getShareLinkResponseDTO = (data) => {
  const { scope, content, shareLink } = data;

  return {
    message: "공유된 프로젝트에 접속했습니다.",

    shareInfo: {
      shareToken: shareLink.shareToken,
      scope: scope,
      createdAt: shareLink.createdAt,
    },
    projectContent: {
      title: content.title,
      slides: content.slides,
      video: content.video || null,
    },
  };
};

export const GetShareLinkListResponseDTO = (links) => {
  return links.map((link) => ({
    shareId: link.id.toString(),
    scope: link.scope,
    shareToken: link.shareToken,
    isActive: link.isActive,
    viewCount: link.viewCount,
    videoTitle: link.video?.title || null,
    createdAt: link.createdAt,
  }));
};
