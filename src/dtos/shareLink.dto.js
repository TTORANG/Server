export const shareLinkResponseDTO = (link) => {
  return {
    shareId: link.id.toString(),
    projectId: link.projectId.toString(),
    videoId: link.videoId ? link.videoId.toString() : null,
    scope: link.scope,
    shareToken: link.shareToken,
    shareUrl: link.shareUrl,
    expiredAt: link.expiredAt,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
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
