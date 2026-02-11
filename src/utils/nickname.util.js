import { adjectives, animals } from "../constants/nicname.js";
import { prisma } from "../db.config.js";

export const generateAnonymousNickname = (sessionId) => {
  // UUID(sessionId)에서 숫자를 추출하여 해시 값 생성
  const hash = sessionId.split("-").reduce((acc, part) => acc + parseInt(part, 16), 0);

  const adjIndex = hash % adjectives.length;
  const animalIndex = Math.floor(hash / adjectives.length) % animals.length;

  return `${adjectives[adjIndex]} ${animals[animalIndex]}`;
};

export const getUniqueNickname = async (sessionId) => {
  let nickname = generateAnonymousNickname(sessionId);

  // DB에서 해당 닉네임이 이미 있는지 확인 (선택 사항: 익명끼리 겹쳐도 되면 생략 가능)
  const existing = await prisma.user.findFirst({ where: { nickName: nickname } });

  if (existing) {
    // 충돌 시 sessionId의 다른 부분을 활용하거나 랜덤 숫자를 붙임
    const suffix = sessionId.substring(0, 3);
    nickname = `${nickname} ${suffix}`;
  }

  return nickname;
};
