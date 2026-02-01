import { prisma } from "../db.config.js";
import { AuthSessionRequiredError } from "../errors/auth.error.js";
import { InvalidParameterError, VideoNotFoundError } from "../errors/video.error.js";
import eventBus from "../events/eventBus.js";
import { EventTypes } from "../events/eventTypes.js";

// 영상 타임스탬프 리액션 생성
export async function toggleVideoReaction({ videoId, emojiType, timestampMs, userId, sessionId }) {
  if (!sessionId) {
    throw new AuthSessionRequiredError({
      userId: String(userId),
      videoId: String(videoId),
    });
  }

  const vid = toInt(videoId);
  const ts = toInt(timestampMs);

  if (!Number.isInteger(vid) || vid <= 0) {
    throw new VideoNotFoundError({ videoId: String(videoId) });
  }
  if (!emojiType || typeof emojiType !== "string") {
    throw new InvalidParameterError({ emojiType }, "잘못된 이모지 타입입니다.");
  }
  if (!Number.isInteger(ts) || ts < 0) {
    throw new InvalidParameterError({ timestampMs }, "타임스탬프는 0 이상의 정수여야 합니다.");
  }

  const video = await prisma.video.findFirst({
    where: {
      id: vid,
      deletedAt: null,
    },
    select: { id: true, projectId: true },
  });

  if (!video) {
    throw new VideoNotFoundError({ videoId: String(videoId) });
  }

  const existing = await prisma.reaction.findFirst({
    where: {
      userId,
      sessionId,
      targetType: "video",
      targetId: vid,
      timestampMs: ts,
      emojiType,
    },
  });

  if (existing) {
    const newIsDeleted = !existing.isDeleted;

    await prisma.reaction.update({
      where: { id: existing.id },
      data: { isDeleted: newIsDeleted },
    });

    // 실시간 알림을 위한 이벤트 발행
    if (newIsDeleted) {
      await eventBus.publish(EventTypes.REACTION_REMOVED, {
        reactionId: existing.id,
        projectId: video.projectId,
        videoId: vid,
      });
    } else {
      await eventBus.publish(EventTypes.REACTION_ADDED, {
        reactionId: existing.id,
        projectId: video.projectId,
        videoId: vid,
        userId,
        emoji: emojiType,
        timestampMs: ts,
      });
    }

    return {
      resultType: "SUCCESS",
      error: null,
      success: { active: !newIsDeleted },
    };
  }

  const reaction = await prisma.reaction.create({
    data: {
      userId,
      sessionId,
      targetType: "video",
      targetId: vid,
      timestampMs: ts,
      emojiType,
    },
  });

  // 실시간 알림을 위한 이벤트 발행
  await eventBus.publish(EventTypes.REACTION_ADDED, {
    reactionId: reaction.id,
    projectId: video.projectId,
    videoId: vid,
    userId,
    emoji: emojiType,
    timestampMs: ts,
  });

  return {
    resultType: "SUCCESS",
    error: null,
    success: { active: true },
  };
}
