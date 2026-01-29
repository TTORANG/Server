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
