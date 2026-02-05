import SuperJSON from "superjson";
import { emitToRoom, emitToUser } from "../../socket/index.js";
import { SocketEvents } from "../../socket/eventTypes.js";

/**
 * Socket.io는 기본적으로 JSON만 사용하므로, BigInt/Date를 보존하려면
 * payload를 SuperJSON으로 직렬화한 문자열로 보냄.
 * 클라이언트에서는 수신 시 SuperJSON.parse(payload)로 복원하면 됨.
 */
const encode = (payload) => SuperJSON.stringify(payload);

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
      commentId: data.commentId,
      videoId: data.videoId,
      userId: data.userId,
      content: data.content,
      createdAt: data.createdAt,
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
      commentId,
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
      reactionId: data.reactionId,
      videoId: data.videoId,
      userId: data.userId,
      emoji: data.emoji,
      timestamp: data.timestamp,
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
      reactionId,
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
      videoId: data.videoId,
      counts: data.counts,
    })
  );
};
