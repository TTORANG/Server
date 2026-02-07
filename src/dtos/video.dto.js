export const videoListItemDTO = (video) => ({
  videoId: video.id.toString(),
  title: video.title,
  status: video.status,
  durationSeconds: video.durationSeconds,
  rootCommentCount: video.rootCommentCount ?? 0,
  replyCount: video.replyCount ?? 0,
  reactionCount: video.reactionCount ?? 0,
  viewCount: video.viewCount ?? 0,
  thumbnailUrl: video.thumbnailUrl,
  createdAt: video.createdAt,
});

export const videoListResponseDTO = (videos) => ({
  videos: videos.map(videoListItemDTO),
});

export const recordingStartSuccessDTO = (video) => ({
  videoId: video.id.toString(),
});

export const videoChunkUploadSuccessDTO = () => ({
  ok: true,
});

export const videoDetailDTO = (video) => ({
  videoId: video.id.toString(),
  title: video.title,
  status: video.status,
  durationSeconds: video.durationSeconds,
  width: video.width,
  height: video.height,
  fps: video.fps,
  hlsMasterUrl: video.hlsMasterUrl,
  thumbnailUrl: video.thumbnailUrl,
  createdAt: video.createdAt,
});

export const videoReactionTimelineDTO = (rows) =>
  rows.map((r) => ({
    timestampMs: r.timestampMs,
    emojiType: r.emojiType,
    count: r._count._all,
  }));

export const videoCommentTimelineDTO = (comments) =>
  comments.map((c) => ({
    commentId: c.id.toString(),
    timestampMs: c.timestampMs,
    content: c.content,
    createdAt: c.createdAt,
    user: {
      userId: c.user.id.toString(),
      name: c.user.name,
    },
  }));

export const videoDetailResponseDTO = ({ video, reactions, comments }) => ({
  video: videoDetailDTO(video),
  timeline: {
    reactions: videoReactionTimelineDTO(reactions),
    comments: videoCommentTimelineDTO(comments),
  },
});

export const videoSlideTimelineItemDTO = (event) => ({
  slideId: event.slideId.toString(),
  timestampMs: event.timestampMs,
});

export const videoSlideTimelineResponseDTO = (events) => ({
  slides: events.map(videoSlideTimelineItemDTO),
});

export const recordingFinishSuccessDTO = ({ videoId, status, slideDurations }) => ({
  videoId: videoId.toString(),
  status,
  slideCount: slideDurations.length,
  slideDurations: slideDurations.map((s) => ({
    slideId: s.slideId.toString(),
    totalDurationMs: s.totalDurationMs,
  })),
});
