// import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import mysql from "mysql2/promise";

dotenv.config();

export const prisma = new PrismaClient();

// Cloud Run 환경에서는 Unix 소켓, 로컬에서는 TCP 연결 사용
const isCloudRun = process.env.K_SERVICE !== undefined;

const poolConfig = {
  user: process.env.DB_USER || "root",
  database: process.env.DB_NAME || "umc_9th",
  password: process.env.DB_PASSWORD || "password",
  waitForConnections: true,
  // Pool에 획득할 수 있는 connection이 없을 때,
  // true면 요청을 queue에 넣고 connection을 사용할 수 있게 되면 요청을 실행하며, false이면 즉시 오류를 내보내고 다시 요청
  connectionLimit: 10, // 몇 개의 커넥션을 가지게끔 할 것인지
  queueLimit: 0, // getConnection에서 오류가 발생하기 전에 Pool에 대기할 요청의 개수 한도
};

if (isCloudRun && process.env.CLOUD_SQL_CONNECTION_NAME) {
  // Cloud Run: Unix 소켓 연결
  poolConfig.socketPath = `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`;
} else {
  // 로컬 개발: TCP 연결
  poolConfig.host = process.env.DB_HOST || "localhost";
  poolConfig.port = process.env.DB_PORT || 3306;
}

export const pool = mysql.createPool(poolConfig);
