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
