import { jest } from "@jest/globals";

const mockHandleSocialLoginSuccess = jest.fn();
const mockLogoutUser = jest.fn();
const mockProcessWithdrawal = jest.fn();
const mockReissueToken = jest.fn();

jest.unstable_mockModule("../../src/services/auth.service.js", () => ({
  handleSocialLoginSuccess: mockHandleSocialLoginSuccess,
  logoutUser: mockLogoutUser,
  processWithdrawal: mockProcessWithdrawal,
  reissueToken: mockReissueToken,
}));

const {
  handleLogout,
  handleReissueToken,
  handleSocialLoginCallback,
  handleWithdrawal,
} = await import("../../src/controllers/auth.controller.js");

const {
  logoutResponseDTO,
  reissueTokenDTO,
  withdrawalResponseDTO,
} = await import("../../src/dtos/auth.dto.js");

const { AuthSessionRequiredError, UserNotSameError } = await import(
  "../../src/errors/auth.error.js"
);

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
  };
}

describe("auth.controller", () => {
  const originalFrontendUrl = process.env.FRONTEND_URL;

  beforeEach(() => {
    mockHandleSocialLoginSuccess.mockReset();
    mockLogoutUser.mockReset();
    mockProcessWithdrawal.mockReset();
    mockReissueToken.mockReset();
    process.env.FRONTEND_URL = "http://example.com";
  });

  afterEach(() => {
    process.env.FRONTEND_URL = originalFrontendUrl;
  });

  test("handleSocialLoginCallback sets cookie and redirects", async () => {
    mockHandleSocialLoginSuccess.mockResolvedValue({
      user: { id: 1n },
      tokens: { accessToken: "access", refreshToken: "refresh" },
      sessionId: "session-1",
    });

    const req = { user: { profile: { id: "p" }, provider: "google" } };
    const res = createRes();
    const next = jest.fn();

    await handleSocialLoginCallback(req, res, next);

    expect(mockHandleSocialLoginSuccess).toHaveBeenCalledWith({ id: "p" }, "google");
    expect(res.cookie).toHaveBeenCalledWith(
      "refreshToken",
      "refresh",
      expect.objectContaining({ httpOnly: true, sameSite: "Lax" })
    );
    expect(res.redirect).toHaveBeenCalledWith(
      "http://example.com/auth/callback?accessToken=access&sessionId=session-1"
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("handleLogout returns dto", async () => {
    mockLogoutUser.mockResolvedValue({ id: 9n });

    const req = { user: { id: 9n } };
    const res = createRes();
    const next = jest.fn();

    await handleLogout(req, res, next);

    expect(mockLogoutUser).toHaveBeenCalledWith(9n);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      resultType: "SUCCESS",
      error: null,
      success: logoutResponseDTO({ id: 9n }),
    });
  });

  test("handleWithdrawal blocks different user", async () => {
    const req = { params: { userId: "2" }, user: { id: 1n } };
    const res = createRes();
    const next = jest.fn();

    await handleWithdrawal(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(UserNotSameError);
  });

  test("handleWithdrawal returns dto", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-02-12T00:00:00.000Z"));
    mockProcessWithdrawal.mockResolvedValue({ userId: 5n });

    const req = { params: { userId: "5" }, user: { id: 5n } };
    const res = createRes();
    const next = jest.fn();

    await handleWithdrawal(req, res, next);

    expect(mockProcessWithdrawal).toHaveBeenCalledWith(5n);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      resultType: "SUCCESS",
      error: null,
      success: withdrawalResponseDTO(5n),
    });
    jest.useRealTimers();
  });

  test("handleReissueToken requires refreshToken", async () => {
    const req = { cookies: {} };
    const res = createRes();
    const next = jest.fn();

    await handleReissueToken(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(AuthSessionRequiredError);
  });

  test("handleReissueToken returns dto and sets cookie", async () => {
    mockReissueToken.mockResolvedValue({
      user: { id: 1n, email: "a@b.com", name: "Kim", profileImageUrl: null },
      tokens: { accessToken: "new-access", refreshToken: "new-refresh" },
      sessionId: "session-3",
    });

    const req = { cookies: { refreshToken: "old-refresh" } };
    const res = createRes();
    const next = jest.fn();

    await handleReissueToken(req, res, next);

    expect(mockReissueToken).toHaveBeenCalledWith("old-refresh");
    expect(res.cookie).toHaveBeenCalledWith(
      "refreshToken",
      "new-refresh",
      expect.objectContaining({ httpOnly: true, sameSite: "Lax" })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      resultType: "SUCCESS",
      error: null,
      success: reissueTokenDTO(
        { id: 1n, email: "a@b.com", name: "Kim", profileImageUrl: null },
        { accessToken: "new-access", refreshToken: "new-refresh" },
        "session-3"
      ),
    });
  });
});
