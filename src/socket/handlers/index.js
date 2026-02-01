import { registerRoomHandlers } from "./room.handler.js";

export const registerHandlers = (io, socket) => {
  // Room 관리 핸들러
  registerRoomHandlers(io, socket);

  // TODO: 추가 핸들러 등록
  // registerChatHandlers(io, socket);
  // registerNotificationHandlers(io, socket);
};
