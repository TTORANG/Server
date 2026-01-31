import { emitToRoom, emitToUser } from "../../socket/index.js";
import { SocketEvents } from "../../socket/eventTypes.js";

export const broadcastNewComment = (data) => {
  const { projectId } = data;

  if (!projectId) {
    console.warn("[WebSocket] Cannot broadcast comment - projectId missing");
    return;
  }

  // 해당 프로젝트 Room에 브로드캐스트
  emitToRoom(`project:${projectId}`, SocketEvents.NEW_COMMENT, {
    commentId: data.commentId,
    videoId: data.videoId,
    userId: data.userId,
    content: data.content,
    createdAt: data.createdAt,
  });
};

export const broadcastCommentDeleted = (data) => {
  const { projectId, commentId } = data;

  if (!projectId) return;

  emitToRoom(`project:${projectId}`, SocketEvents.COMMENT_DELETED, {
    commentId,
  });
};

export const broadcastNewReaction = (data) => {
  const { projectId } = data;

  if (!projectId) {
    console.warn("[WebSocket] Cannot broadcast reaction - projectId missing");
    return;
  }

  emitToRoom(`project:${projectId}`, SocketEvents.NEW_REACTION, {
    reactionId: data.reactionId,
    videoId: data.videoId,
    userId: data.userId,
    emoji: data.emoji,
    timestamp: data.timestamp,
  });
};

export const broadcastReactionRemoved = (data) => {
  const { projectId, reactionId } = data;

  if (!projectId) return;

  emitToRoom(`project:${projectId}`, SocketEvents.REACTION_REMOVED, {
    reactionId,
  });
};

export const broadcastReactionCountUpdated = (data) => {
  const { projectId } = data;

  if (!projectId) return;

  emitToRoom(`project:${projectId}`, SocketEvents.REACTION_COUNT_UPDATED, {
    videoId: data.videoId,
    counts: data.counts,
  });
};
