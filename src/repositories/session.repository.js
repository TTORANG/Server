import { prisma } from "../db.config.js";
import { SessionNotFoundError, SessionAccessDeniedError } from "../errors/session.error.js";

// 익명 세션 및 임시 유저 생성
export const createAnonymousSession = async (sessionId) => {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7일

  return await prisma.$transaction(async (tx) => {
    // 임시유저 생성
    const anonymousUser = await tx.user.create({
      data: {
        name: "익명 사용자",
        email: `anon_${sessionId}@ttorang.com`,
        oauthProvider: "anonymous",
        oauthId: sessionId,
        role: "anonymous",
      },
    });

    // 세션 생성
    return await tx.session.create({
      data: {
        id: sessionId,
        userId: anonymousUser.id,
        isAnonymous: true,
        expiresAt,
      },
    });
  });
};

// ID로 세션 조회
export const findSessionById = async (sessionId) => {
  return await prisma.session.findUnique({
    where: { id: sessionId },
  });
};

// 데이터 병합 트랜잭션
export const mergeDataByUserId = async (anonymousSessionId, targetUserId) => {
  return await prisma.$transaction(async (tx) => {
    // 1. 익명 세션 정보 조회 (익명 유저 ID 확인)
    const anonSession = await tx.session.findUnique({
      where: { id: anonymousSessionId },
    });

    if (!anonSession) {
      throw new SessionNotFoundError({ anonymousSessionId });
    }
    const anonUserId = anonSession.userId;

    // 2. 소유권 이전 (UpdateMany)
    // 프로젝트 이전
    const projectUpdate = await tx.project.updateMany({
      where: { userId: anonUserId },
      data: { userId: targetUserId },
    });

    // 댓글 이전
    await tx.comment.updateMany({
      where: { userId: anonUserId },
      data: { userId: targetUserId },
    });

    // 반응(이모지) 이전
    await tx.reaction.updateMany({
      where: { userId: anonUserId },
      data: { userId: targetUserId },
    });

    // 3. 익명 데이터 정리
    // 세션 삭제
    await tx.session.delete({
      where: { id: anonymousSessionId },
    });

    // 익명 임시 유저 삭제 (선택 사항: 데이터를 병합했으므로 삭제 가능)
    await tx.user.delete({
      where: { id: anonUserId },
    });

    // 병합된 프로젝트 수 반환
    return projectUpdate.count;
  });
};

export const createAnonymousProject = async (userId, title) => {
  return await prisma.project.create({
    data: {
      userId: userId,
      title: title || "제목 없는 프로젝트",
      isDeleted: false,
    },
  });
};

export const updateAnonymousProject = async (projectId, userId, title) => {
  try {
    return await prisma.project.update({
      where: {
        id: BigInt(projectId),
        userId: userId,
      },
      data: {
        title: title,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    if (error.code === "P2025") {
      throw new SessionAccessDeniedError({ projectId });
    }
    throw error;
  }
};

// 소셜 로그인 성공 시 세션 업데이트 또는 생성 (보안 로직용)
export const upsertUserSession = async (userId, refreshToken) => {
  return await prisma.session.upsert({
    where: {
      uq_session_user_anonymous: {
        userId: userId,
        isAnonymous: false,
      },
    },
    update: {
      refreshToken: refreshToken,
      lastSeenAt: new Date(),
    },
    create: {
      userId: userId,
      refreshToken: refreshToken,
      isAnonymous: false,
    },
  });
};
