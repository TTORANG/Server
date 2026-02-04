import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const secret = process.env.JWT_SECRET;

if (!secret) {
  console.error("JWT_SECRET 환경변수가 설정되지 않았습니다.");
  process.exit(1);
}

const payload = {
  id: "1",
  email: "test1@example.com",
  sessionId: "a0000000-0000-0000-0000-000000000001",
};

const accessToken = jwt.sign(payload, secret, {
  expiresIn: "1h",
});

console.log("Access Token:");
console.log(accessToken);
console.log("\n사용법:");
console.log(`curl -H "Authorization: Bearer ${accessToken}" http://localhost:3000/api/...`);
