export const registerRoomHandlers = (io, socket) => {
  
  socket.on("join-project", (data) => {
    const { projectId } = data;

    if (!projectId) {
      socket.emit("error", { message: "projectId is required" });
      return;
    }

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

  socket.on("leave-project", (data) => {
    const { projectId } = data;

    if (!projectId) {
      socket.emit("error", { message: "projectId is required" });
      return;
    }

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
