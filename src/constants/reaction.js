export const ALLOWED_EMOJIS = ["fire", "good", "bad", "sleepy", "confused"];

export function createEmptyReactionMap() {
  return Object.fromEntries(ALLOWED_EMOJIS.map((emojiType) => [emojiType, 0]));
}
