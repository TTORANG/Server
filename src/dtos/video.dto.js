import { toPublicStorageUrl } from "../utils/storageUrl.util.js";

export const videoListItemDTO = (video) => ({
  videoId: video.id.toString(),
  title: video.title,
  status: video.status,
  durationSeconds: video.durationSeconds,
  rootCommentCount: video.rootCommentCount ?? 0,
  replyCount: video.replyCount ?? 0,
  feedbackCount: video.feedbackCount ?? 0,
  reactionCount: video.reactionCount ?? 0,
  viewCount: video.viewCount ?? 0,
  thumbnailUrl: toPublicStorageUrl(video.thumbnailUrl),
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
  hlsMasterUrl: toPublicStorageUrl(video.hlsMasterUrl),
  thumbnailUrl: toPublicStorageUrl(video.thumbnailUrl),
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
      userId: c.user?.id?.toString() ?? null,
      name: c.user?.name ?? null,
      profileImageUrl: c.user?.profileImageUrl ?? null,
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
  title: event.slide?.title ?? null,
  timestampMs: event.timestampMs,
});

export const videoSlideTimelineResponseDTO = (events) => ({
  slides: events.map(videoSlideTimelineItemDTO),
});

export const recordingFinishSuccessDTO = ({ videoId, status, slideDurations }) => ({
  videoId: videoId.toString(),
  status,
  // slideDurations는 전환 구간 기준 집계라 첫 슬라이드가 포함되지 않아 +1 보정
  slideCount: slideDurations.length + 1,
  slideDurations: slideDurations.map((s) => ({
    slideId: s.slideId.toString(),
    totalDurationMs: s.totalDurationMs,
  })),
});

export const videoDeleteSuccessDTO = ({ videoId }) => ({
  videoId: videoId.toString(),
});

export const videoTitleResponseDTO = (video) => ({
  videoId: video.id.toString(),
  title: video.title,
  createdAt: video.createdAt,
});

export const videoTitleUpdateSuccessDTO = (video) => ({
  videoId: video.id.toString(),
  title: video.title,
  updatedAt: video.updatedAt,
});
