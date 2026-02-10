import { ALLOWED_EMOJIS } from "../constants/reaction.js";

export function ToggleReactionDto(body) {
  return {
    emojiType: body?.emojiType,
  };
}

export const slideReactionCreateResponseDTO = ({ reactionId, slideId, emojiType, createdAt }) => ({
  reactionId: reactionId.toString(),
  slideId: slideId.toString(),
  emojiType,
  createdAt,
});

export const reactionMarkersResponseDTO = ({ intervalMs, markers }) => ({
  intervalMs,
  markers: markers.map((m) => ({
    timestampMs: m.timestampMs,
    emojiType: m.emojiType,
    count: m.count,
  })),
});

export const reactionBucketsResponseDTO = ({ intervalMs, buckets }) => ({
  intervalMs,
  buckets: buckets.map((bucket) => ({
    timestampMs: bucket.timestampMs,
    totalCount: bucket.totalCount,
    reactions: bucket.reactions,
  })),
});

export const slideReactionSummaryResponseDTO = ({ slideId, rows }) => {
  const summary = {};
  const active = {};
  ALLOWED_EMOJIS.forEach((e) => {
    summary[e] = 0;
    active[e] = false;
  });

  rows.forEach((r) => {
    summary[r.emojiType] = r._count._all;
    active[r.emojiType] = r._count._all > 0;
  });

  return {
    slideId: slideId.toString(),
    reactions: summary,
    active,
  };
};

export const videoReactionCreateResponseDTO = ({
  reactionId,
  videoId,
  emojiType,
  timestampMs,
  createdAt,
}) => ({
  reactionId: reactionId.toString(),
  videoId: videoId.toString(),
  emojiType,
  timestampMs,
  createdAt,
});

const makeEmptyReactionMap = () => {
  const map = {};
  ALLOWED_EMOJIS.forEach((e) => (map[e] = 0));
  return map;
};

export const projectSlideReactionSummaryResponseDTO = ({ projectId, rows }) => {
  const totalReactions = makeEmptyReactionMap();
  let totalCount = 0;

  rows.forEach((r) => {
    const count = r._count._all;
    totalReactions[r.emojiType] += count;
    totalCount += count;
  });

  return {
    projectId: projectId.toString(),
    totalReactions,
    totalCount,
  };
};
