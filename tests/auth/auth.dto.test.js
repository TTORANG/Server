import { jest } from "@jest/globals";
import {
  logoutResponseDTO,
  reissueTokenDTO,
  signinResponseDTO,
  withdrawalResponseDTO,
} from "../../src/dtos/auth.dto.js";

describe("auth.dto", () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  test("signinResponseDTO maps user and tokens", () => {
    const dto = signinResponseDTO(
      { id: 1n, email: "a@b.com", name: "Kim", profileImageUrl: null },
      { accessToken: "access", refreshToken: "refresh" },
      "session-1"
    );

    expect(dto).toEqual({
      message: "소셜 로그인 성공!",
      user: {
        id: "1",
        email: "a@b.com",
        name: "Kim",
        profileImageUrl: null,
        sessionId: "session-1",
      },
      tokens: { accessToken: "access", refreshToken: "refresh" },
    });
  });

  test("logoutResponseDTO handles null user", () => {
    expect(logoutResponseDTO(null)).toEqual({
      message: "성공적으로 로그아웃되었습니다.",
      user: { id: null },
    });
  });

  test("withdrawalResponseDTO returns withdrawnAt", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-02-12T00:00:00.000Z"));

    const dto = withdrawalResponseDTO(5n);

    expect(dto).toEqual({
      message: "계정이 성공적으로 삭제되었습니다.",
      user: { id: "5" },
      withdrawnAt: "2026-02-12T00:00:00.000Z",
    });
    jest.useRealTimers();
  });

  test("reissueTokenDTO includes accessToken only", () => {
    const dto = reissueTokenDTO(
      { id: 2n, email: "x@y.com", name: "Lee", profileImageUrl: "img", sessionId: null },
      { accessToken: "new-access", refreshToken: "new-refresh" },
      "session-2"
    );

    expect(dto).toEqual({
      message: "리프레시 토큰이 재발급되었습니다.",
      user: {
        id: "2",
        email: "x@y.com",
        name: "Lee",
        profileImageUrl: "img",
        sessionId: "session-2",
      },
      tokens: { accessToken: "new-access" },
    });
  });
});
