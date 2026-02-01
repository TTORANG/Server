import jwt from "jsonwebtoken";

export const authMiddleware = (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    // 토큰 없으면 익명 사용자로 처리 (피드백자)
    if (!token) {
      socket.user = {
        id: null,
        isAnonymous: true,
        sessionId: socket.handshake.auth?.sessionId || null,
      };
      console.log(`[Socket.io Auth] Anonymous user connected: ${socket.id}`);
      return next();
    }

    // JWT 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 사용자 정보를 socket에 저장
    socket.user = {
      id: decoded.id,
      email: decoded.email,
      isAnonymous: false,
    };

    console.log(`[Socket.io Auth] User authenticated: ${decoded.id}`);
    next();
  } catch (error) {
    // 토큰 만료 또는 유효하지 않음
    if (error.name === "TokenExpiredError") {
      console.log(`[Socket.io Auth] Token expired: ${socket.id}`);
      // 만료된 토큰이어도 익명으로 연결 허용 (피드백 기능은 사용 가능)
      socket.user = {
        id: null,
        isAnonymous: true,
        tokenExpired: true,
      };
      return next();
    }

    console.error(`[Socket.io Auth] Invalid token: ${error.message}`);
    // 잘못된 토큰도 익명으로 연결 허용
    socket.user = {
      id: null,
      isAnonymous: true,
    };
    next();
  }
};
