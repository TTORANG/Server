import { jest } from "@jest/globals";
import { anonymousSessionResponseDTO, mergeResultResponseDTO } from "../../src/dtos/session.dto.js";

describe("session.dto", () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  test("anonymousSessionResponseDTO builds expiresAt", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-02-12T00:00:00.000Z"));

    const dto = anonymousSessionResponseDTO("session-1", {
      accessToken: "access",
      refreshToken: "refresh",
    });

    expect(dto).toEqual({
      message: "익명 세션이 성공적으로 발급되었습니다.",
      sessionId: "session-1",
      accessToken: "access",
      refreshToken: "refresh",
      expiresIn: "7d",
      expiresAt: "2026-02-19T00:00:00.000Z",
    });
    jest.useRealTimers();
  });

  test("mergeResultResponseDTO returns merged count", () => {
    expect(mergeResultResponseDTO(3)).toEqual({
      message: "데이터 병합이 완료되었습니다.",
      mergedProjectsCount: 3,
    });
  });
});
