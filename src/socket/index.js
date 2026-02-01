/**
 * Socket.io 서버 초기화
 * Redis Adapter로 다중 컨테이너 환경 지원
 */

import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { authMiddleware } from "./middleware/auth.middleware.js";
import { registerHandlers } from "./handlers/index.js";

let io = null;

export const initializeSocket = async (httpServer) => {
  // Socket.io 서버 생성
  io = new Server(httpServer, {
    cors: {
      origin: "*", // TODO: 운영 환경에서는 특정 도메인만 허용
      methods: ["GET", "POST"],
    },
    // Cloud Run 환경 설정
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Redis Adapter 연결 (다중 컨테이너 환경)
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  try {
    const pubClient = new Redis(redisUrl);
    const subClient = pubClient.duplicate();

    pubClient.on("connect", () => {
      console.log("[Socket.io] Redis Adapter - Publisher connected");
    });

    subClient.on("connect", () => {
      console.log("[Socket.io] Redis Adapter - Subscriber connected");
    });

    pubClient.on("error", (err) => {
      console.error("[Socket.io] Redis Adapter - Publisher error:", err.message);
    });

    subClient.on("error", (err) => {
      console.error("[Socket.io] Redis Adapter - Subscriber error:", err.message);
    });

    // Redis Adapter 적용
    io.adapter(createAdapter(pubClient, subClient));
    console.log("[Socket.io] Redis Adapter initialized");
  } catch (error) {
    console.error("[Socket.io] Redis Adapter failed:", error.message);
    console.log("[Socket.io] Running without Redis Adapter (single server mode)");
  }

  // 인증 미들웨어 적용
  io.use(authMiddleware);

  // 연결 이벤트 핸들러 등록
  io.on("connection", (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}, User: ${socket.user?.id || "anonymous"}`);

    // 핸들러 등록
    registerHandlers(io, socket);

    // 연결 해제
    socket.on("disconnect", (reason) => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}, Reason: ${reason}`);
    });
  });

  console.log("[Socket.io] Server initialized");
  return io;
};

export const getIO = () => {
  if (!io) {
    console.warn("[Socket.io] Server not initialized yet");
  }
  return io;
};

export const emitToRoom = (room, event, data) => {
  if (!io) {
    console.warn("[Socket.io] Cannot emit - server not initialized");
    return;
  }
  io.to(room).emit(event, data);
  console.log(`[Socket.io] Emitted "${event}" to room "${room}":`, data);
};

export const emitToUser = (userId, event, data) => {
  if (!io) {
    console.warn("[Socket.io] Cannot emit - server not initialized");
    return;
  }
  io.to(`user:${userId}`).emit(event, data);
  console.log(`[Socket.io] Emitted "${event}" to user "${userId}":`, data);
};
