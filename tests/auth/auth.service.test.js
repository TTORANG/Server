import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

const mockDeleteRefreshTokenBySession = jest.fn();
const mockDeleteSession = jest.fn();
const mockFindSessionByToken = jest.fn();
const mockWithdrawUser = jest.fn();
const mockCreateSocialUser = jest.fn();
const mockFindUserByEmail = jest.fn();
const mockFindUserById = jest.fn();
const mockUpdateSessionToken = jest.fn();
const mockUpdateUserProfileImage = jest.fn();

const mockCreateUserSession = jest.fn();

jest.unstable_mockModule("../../src/repositories/auth.repository.js", () => ({
  deleteRefreshTokenBySession: mockDeleteRefreshTokenBySession,
  deleteSession: mockDeleteSession,
  findSessionByToken: mockFindSessionByToken,
  withdrawUser: mockWithdrawUser,
  createSocialUser: mockCreateSocialUser,
  findUserByEmail: mockFindUserByEmail,
  findUserById: mockFindUserById,
  updateSessionToken: mockUpdateSessionToken,
  updateUserProfileImage: mockUpdateUserProfileImage,
}));

jest.unstable_mockModule("../../src/repositories/session.repository.js", () => ({
  createUserSession: mockCreateUserSession,
}));

const { handleSocialLoginSuccess, logoutUser, reissueToken } = await import(
  "../../src/services/auth.service.js"
);
const { RefreshTokenInvalidatedError } = await import("../../src/errors/auth.error.js");

describe("auth.service", () => {
  beforeEach(() => {
    mockDeleteRefreshTokenBySession.mockReset();
    mockDeleteSession.mockReset();
    mockFindSessionByToken.mockReset();
    mockWithdrawUser.mockReset();
    mockCreateSocialUser.mockReset();
    mockFindUserByEmail.mockReset();
    mockFindUserById.mockReset();
    mockUpdateSessionToken.mockReset();
    mockUpdateUserProfileImage.mockReset();
    mockCreateUserSession.mockReset();
  });

  test("같은 유저 연속 로그인 시 서로 다른 세션을 생성한다", async () => {
    const user = {
      id: 1n,
      email: "user@example.com",
      name: "Kim",
      profileImageUrl: "https://cdn.example.com/profile.png",
      isDeleted: false,
    };
    mockFindUserByEmail.mockResolvedValue(user);
    mockCreateUserSession.mockResolvedValue({});

    const profile = {
      id: "google-1",
      displayName: "Kim",
      emails: [{ value: "user@example.com" }],
      photos: [{ value: "https://cdn.example.com/profile.png" }],
    };

    const first = await handleSocialLoginSuccess(profile, "google");
    const second = await handleSocialLoginSuccess(profile, "google");

    expect(first.sessionId).not.toBe(second.sessionId);
    expect(mockCreateUserSession).toHaveBeenCalledTimes(2);
    expect(mockCreateUserSession.mock.calls[0][0]).toBe(1n);
    expect(mockCreateUserSession.mock.calls[0][2]).toBe(first.sessionId);
    expect(mockCreateUserSession.mock.calls[1][0]).toBe(1n);
    expect(mockCreateUserSession.mock.calls[1][2]).toBe(second.sessionId);

    const decodedFirstRefresh = jwt.verify(first.tokens.refreshToken, process.env.JWT_SECRET);
    const decodedSecondRefresh = jwt.verify(second.tokens.refreshToken, process.env.JWT_SECRET);
    expect(decodedFirstRefresh.sid).toBe(first.sessionId);
    expect(typeof decodedFirstRefresh.jti).toBe("string");
    expect(decodedSecondRefresh.sid).toBe(second.sessionId);
    expect(typeof decodedSecondRefresh.jti).toBe("string");
  });

  test("legacy refresh token({id})도 재발급 가능하다", async () => {
    const legacyRefreshToken = jwt.sign({ id: "1" }, process.env.JWT_SECRET, {
      expiresIn: "14d",
    });
    mockFindSessionByToken.mockResolvedValue({
      id: "session-legacy",
      userId: 1n,
      refreshToken: legacyRefreshToken,
      isAnonymous: false,
    });
    mockFindUserById.mockResolvedValue({
      id: 1n,
      email: "user@example.com",
      name: "Kim",
      profileImageUrl: null,
      isDeleted: false,
    });
    mockUpdateSessionToken.mockResolvedValue({});

    const result = await reissueToken(legacyRefreshToken);

    expect(result.sessionId).toBe("session-legacy");
    expect(mockUpdateSessionToken).toHaveBeenCalledTimes(1);
    expect(mockUpdateSessionToken.mock.calls[0][0]).toBe("session-legacy");

    const newRefreshToken = mockUpdateSessionToken.mock.calls[0][1];
    const decodedNewRefresh = jwt.verify(newRefreshToken, process.env.JWT_SECRET);
    expect(decodedNewRefresh.sid).toBe("session-legacy");
    expect(typeof decodedNewRefresh.jti).toBe("string");
  });

  test("refresh token의 sid가 DB 세션과 다르면 재발급 실패", async () => {
    const refreshTokenWithMismatchedSid = jwt.sign(
      { id: "1", sid: "session-other", jti: "jti-1" },
      process.env.JWT_SECRET,
      { expiresIn: "14d" }
    );

    mockFindSessionByToken.mockResolvedValue({
      id: "session-actual",
      userId: 1n,
      refreshToken: refreshTokenWithMismatchedSid,
      isAnonymous: false,
    });

    await expect(reissueToken(refreshTokenWithMismatchedSid)).rejects.toBeInstanceOf(
      RefreshTokenInvalidatedError
    );
    expect(mockUpdateSessionToken).not.toHaveBeenCalled();
  });

  test("로그아웃은 현재 세션만 무효화한다", async () => {
    mockDeleteRefreshTokenBySession.mockResolvedValue({ count: 1 });

    const result = await logoutUser(3n, "session-3");

    expect(mockDeleteRefreshTokenBySession).toHaveBeenCalledWith(3n, "session-3");
    expect(result).toEqual({ id: 3n });
  });
});
