import { v4 as uuidv4 } from "uuid";
import {
  createAnonymousProject,
  createAnonymousSession,
  findSessionById,
  mergeDataByUserId,
  updateAnonymousProject,
  upsertUserSession,
} from "../repositories/session.repository.js";
import { generateTokens } from "./auth.service.js";
import { SessionNotFoundError, NoDataToMergeError } from "../errors/session.error.js";

// 익명세션 ID 생성
export const issueAnonymousSession = async () => {
  const sessionId = uuidv4(); // uuid 생성
  const session = await createAnonymousSession(sessionId); // 익명 세션 및 임시 유저 생성

  const tokens = generateTokens({
    // JWT 토큰 생성
    id: session.userId,
    email: `anon_${sessionId}@ttorang.com`,
  });

  return { sessionId, tokens };
};

// 로그인 후 익명 데이터 병합
export const mergeAnonymousData = async (anonymousSessionId, userId) => {
  const session = await findSessionById(anonymousSessionId);

  if (!session || !session.isAnonymous) {
    throw new SessionNotFoundError({ sessionId: anonymousSessionId });
  }
  const mergedCount = await mergeDataByUserId(anonymousSessionId, userId);
  if (mergedCount === 0) {
    throw new NoDataToMergeError({ anonymousSessionId });
  }
  return mergedCount;
};

// 익명 프로젝트 시작
export const startAnonymousProject = async (userId, title) => {
  const project = await createAnonymousProject(userId, title);

  return {
    id: project.id.toString(),
    title: project.title,
    createdAt: project.createdAt,
  };
};

// 익명 프로젝트 업데이트
export const editAnonymousProject = async (projectId, userId, title) => {
  const project = await updateAnonymousProject(projectId, userId, title);

  return {
    id: project.id.toString(),
    title: project.title,
    updatedAt: project.updatedAt,
  };
};

// 로그인 성공 후 세션 정보 업데이트 (레포지토리 함수 사용)
export const handleSocialLoginSuccess = async (user) => {
  // 1. 토큰 생성
  const tokens = generateTokens(user);
  await upsertUserSession(user.id, tokens.refreshToken);

  return { user, tokens };
};
