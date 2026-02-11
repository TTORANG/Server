import { adjectives, animals } from "../constants/nicname.js";
import { prisma } from "../db.config.js";

export const generateAnonymousNickname = (sessionId) => {
  // UUID(sessionId)에서 숫자를 추출하여 해시 값 생성
  const hash = sessionId.split("-").reduce((acc, part) => acc + parseInt(part, 16), 0);

  const adjIndex = hash % adjectives.length;
  const animalIndex = (hash >> 8) % animals.length;

  const adj = adjectives[adjIndex];
  const animal = animals[animalIndex];

  if (!adj || !animal) {
    // 방어적 fallback: 입력이 이상하면 무작위 조합 반환
    const safeAdj = adjectives[Math.floor(Math.random() * adjectives.length)] || "익명";
    const safeAnimal = animals[Math.floor(Math.random() * animals.length)] || "사용자";
    return `${safeAdj} ${safeAnimal}`;
  }

  return `${adj} ${animal}`;
};

export const getUniqueNickname = async (sessionId) => {
  let nickname = generateAnonymousNickname(sessionId);

  // 최종 검증: 혹시라도 undefined/NaN이 섞이면 안전한 값으로 교체
  if (!nickname || nickname.includes("undefined") || nickname.includes("NaN")) {
    const safeAdj = adjectives[Math.floor(Math.random() * adjectives.length)] || "익명";
    const safeAnimal = animals[Math.floor(Math.random() * animals.length)] || "사용자";
    nickname = `${safeAdj} ${safeAnimal}`;
  }

  // DB에서 해당 닉네임이 이미 있는지 확인 (선택 사항: 익명끼리 겹쳐도 되면 생략 가능)
  const existing = await prisma.user.findFirst({ where: { nickName: nickname } });

  if (existing) {
    // 충돌 시 sessionId의 다른 부분을 활용하거나 랜덤 숫자를 붙임
    const suffix = sessionId.substring(0, 3);
    nickname = `${nickname} ${suffix}`;
  }
  return nickname;
};
