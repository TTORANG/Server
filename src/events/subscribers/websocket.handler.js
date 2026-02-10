import SuperJSON from "superjson";
import { emitToRoom, emitToUser } from "../../socket/index.js";
import { SocketEvents } from "../../socket/eventTypes.js";

/**
 * Socket.io는 기본적으로 JSON만 사용하므로, BigInt/Date를 보존하려면
 * payload를 SuperJSON으로 직렬화한 문자열로 보냄.
 * 클라이언트에서는 수신 시 SuperJSON.parse(payload)로 복원하면 됨.
 */
const encode = (payload) => SuperJSON.stringify(payload);

const normalizeTarget = (data) => {
  const targetType = data.targetType ?? (data.videoId ? "video" : data.slideId ? "slide" : null);
  const targetId =
    data.targetId ?? (targetType === "video" ? data.videoId ?? null : data.slideId ?? null);
  return {
    targetType,
    targetId: targetId ?? null,
    slideId: data.slideId ?? (targetType === "slide" ? targetId : null),
    videoId: data.videoId ?? (targetType === "video" ? targetId : null),
  };
};

export const broadcastNewComment = (data) => {
  const { projectId } = data;

  if (!projectId) {
    console.warn("[WebSocket] Cannot broadcast comment - projectId missing");
    return;
  }

  emitToRoom(
    `project:${projectId}`,
    SocketEvents.NEW_COMMENT,
    encode({
      projectId,
      commentId: data.commentId,
      userId: data.userId,
      content: data.content,
      parentCommentId: data.parentCommentId ?? null,
      timestampMs: data.timestampMs ?? null,
      createdAt: data.createdAt,
      ...normalizeTarget(data),
    })
  );
};

export const broadcastCommentDeleted = (data) => {
  const { projectId, commentId } = data;

  if (!projectId) return;

  emitToRoom(
    `project:${projectId}`,
    SocketEvents.COMMENT_DELETED,
    encode({
      projectId,
      commentId,
      parentCommentId: data.parentCommentId ?? null,
      timestampMs: data.timestampMs ?? null,
      ...normalizeTarget(data),
    })
  );
};

export const broadcastCommentUpdated = (data) => {
  const { projectId, commentId } = data;

  if (!projectId || !commentId) return;

  emitToRoom(
    `project:${projectId}`,
    SocketEvents.COMMENT_UPDATED,
    encode({
      projectId,
      commentId,
      userId: data.userId ?? null,
      content: data.content,
      updatedAt: data.updatedAt,
      parentCommentId: data.parentCommentId ?? null,
      timestampMs: data.timestampMs ?? null,
      ...normalizeTarget(data),
    })
  );
};

export const broadcastNewReaction = (data) => {
  const { projectId } = data;

  if (!projectId) {
    console.warn("[WebSocket] Cannot broadcast reaction - projectId missing");
    return;
  }

  emitToRoom(
    `project:${projectId}`,
    SocketEvents.NEW_REACTION,
    encode({
      projectId,
      reactionId: data.reactionId,
      userId: data.userId ?? null,
      emojiType: data.emojiType ?? data.emoji ?? null,
      timestampMs: data.timestampMs ?? null,
      active: data.active ?? true,
      ...normalizeTarget(data),
    })
  );
};

export const broadcastReactionRemoved = (data) => {
  const { projectId, reactionId } = data;

  if (!projectId) return;

  emitToRoom(
    `project:${projectId}`,
    SocketEvents.REACTION_REMOVED,
    encode({
      projectId,
      reactionId,
      userId: data.userId ?? null,
      emojiType: data.emojiType ?? data.emoji ?? null,
      timestampMs: data.timestampMs ?? null,
      active: data.active ?? false,
      ...normalizeTarget(data),
    })
  );
};

export const broadcastReactionCountUpdated = (data) => {
  const { projectId } = data;

  if (!projectId) return;

  emitToRoom(
    `project:${projectId}`,
    SocketEvents.REACTION_COUNT_UPDATED,
    encode({
      projectId,
      targetType: "video",
      targetId: data.videoId ?? null,
      videoId: data.videoId,
      counts: data.counts,
      totalCount: data.totalCount ?? null,
    })
  );
};
