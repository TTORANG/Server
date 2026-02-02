import { ALLOWED_EMOJIS } from "../constants/reaction.js";

export function ToggleReactionDto(body) {
  return {
    emojiType: body?.emojiType,
  };
}

export const reactionMarkersResponseDTO = ({ intervalMs, markers }) => ({
  intervalMs,
  markers: markers.map((m) => ({
    timestampMs: m.timestampMs,
    emojiType: m.emojiType,
    count: m.count,
  })),
});

export const slideReactionSummaryResponseDTO = ({ slideId, rows }) => {
  const summary = {};
  ALLOWED_EMOJIS.forEach((e) => (summary[e] = 0));

  rows.forEach((r) => {
    summary[r.emojiType] = r._count._all;
  });

  return {
    slideId: slideId.toString(),
    reactions: summary,
  };
};

export const videoReactionToggleResponseDTO = ({ reactionId, videoId, active }) => ({
  reactionId: reactionId.toString(),
  videoId: videoId.toString(),
  active,
});
