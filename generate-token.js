import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const secret = process.env.JWT_SECRET;

if (!secret) {
  console.error("JWT_SECRET 환경변수가 설정되지 않았습니다.");
  process.exit(1);
}

const payload = {
  id: "4",
  email: "test@example.com",
  sessionId: "df1b8637-b2ca-45ce-a8fc-72b7c2b4b029",
};

// 200시간 = 200 * 3600초 (문자열 "200h" 파싱 이슈 방지를 위해 초 단위 숫자 사용)
const accessToken = jwt.sign(payload, secret, {
  expiresIn: 200 * 60 * 60,
});

console.log("Access Token:");
console.log(accessToken);
console.log("\n사용법:");
console.log(`curl -H "Authorization: Bearer ${accessToken}" http://localhost:3000/api/...`);
