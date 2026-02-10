import { findProjectIdByShareToken } from "../../repositories/shareLink.repository.js";

export const registerRoomHandlers = (io, socket) => {

  socket.on("join-project", async (data) => {
    const { shareToken } = data;

    if (!shareToken) {
      socket.emit("error", { message: "shareToken is required" });
      return;
    }

    // shareToken → projectId 변환
    const shareLink = await findProjectIdByShareToken(shareToken);
    if (!shareLink || !shareLink.isActive) {
      socket.emit("error", { message: "유효하지 않은 공유 링크입니다." });
      return;
    }
    if (shareLink.expiredAt && shareLink.expiredAt < new Date()) {
      socket.emit("error", { message: "만료된 공유 링크입니다." });
      return;
    }

    const projectId = Number(shareLink.projectId);
    const roomName = `project:${projectId}`;

    // Room 입장
    socket.join(roomName);

    // 사용자별 Room도 입장 (개인 알림용)
    if (socket.user?.id) {
      socket.join(`user:${socket.user.id}`);
    }

    console.log(`[Room] Socket ${socket.id} joined room: ${roomName}`);

    // 입장 확인 응답
    socket.emit("joined-project", {
      projectId,
      message: `Joined project ${projectId}`,
    });

  });

  socket.on("leave-project", async (data) => {
    const { shareToken } = data;

    if (!shareToken) {
      socket.emit("error", { message: "shareToken is required" });
      return;
    }

    const shareLink = await findProjectIdByShareToken(shareToken);
    if (!shareLink) {
      socket.emit("error", { message: "유효하지 않은 공유 링크입니다." });
      return;
    }

    const projectId = Number(shareLink.projectId);
    const roomName = `project:${projectId}`;

    // Room 퇴장
    socket.leave(roomName);

    console.log(`[Room] Socket ${socket.id} left room: ${roomName}`);

    // 퇴장 확인 응답
    socket.emit("left-project", {
      projectId,
      message: `Left project ${projectId}`,
    });
  });

  socket.on("get-rooms", () => {
    const rooms = Array.from(socket.rooms).filter((room) => room !== socket.id);
    socket.emit("rooms-list", { rooms });
  });
};
