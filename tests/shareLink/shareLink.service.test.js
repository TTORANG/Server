import { jest } from "@jest/globals";

jest.unstable_mockModule("../../src/repositories/shareLink.repository.js", () => ({
  createShareLink: jest.fn(),
  findExistingLink: jest.fn(),
  findProjectById: jest.fn(),
  findShareLinkWithComments: jest.fn(),
  findShareLinkWithContent: jest.fn(),
  findVideoInProject: jest.fn(),
  getShareLinkList: jest.fn(),
  getVideoList: jest.fn(),
  incrementViewCount: jest.fn(),
}));

jest.unstable_mockModule("../../src/repositories/session.repository.js", () => ({
  findSessionById: jest.fn(),
  findSessionByIdWithUser: jest.fn(),
  findSessionUserIdById: jest.fn(),
}));

jest.unstable_mockModule("../../src/repositories/analytics.repository.js", () => ({
  createPageView: jest.fn(),
}));

jest.unstable_mockModule("../../src/services/session.service.js", () => ({
  issueAnonymousSession: jest.fn(),
}));

jest.unstable_mockModule("../../src/utils/storageUrl.util.js", () => ({
  toPublicStorageUrl: jest.fn((url) => url),
}));

const shareRepo = await import("../../src/repositories/shareLink.repository.js");
const sessionRepo = await import("../../src/repositories/session.repository.js");
const analyticsRepo = await import("../../src/repositories/analytics.repository.js");
const { processGetShareContent } = await import("../../src/services/shareLink.service.js");

const createShareLinkFixture = (user) => ({
  id: 1n,
  projectId: 10n,
  videoId: null,
  scope: "slides_script",
  shareToken: "token-123",
  isActive: true,
  expiredAt: null,
  createdAt: new Date("2026-02-12T00:00:00.000Z"),
  project: {
    isDeleted: false,
    title: "공유 프로젝트",
    user,
    slides: [],
    comments: [],
  },
  video: null,
});

describe("shareLink.service publisherName", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    sessionRepo.findSessionByIdWithUser.mockResolvedValue({
      userId: 99n,
      isAnonymous: false,
      user: {
        name: "뷰어",
        nickName: "뷰어닉",
      },
    });
    analyticsRepo.createPageView.mockResolvedValue({});
    shareRepo.incrementViewCount.mockResolvedValue({});
  });

  test("publisher user.nickName이 있으면 우선 사용한다", async () => {
    shareRepo.findShareLinkWithContent.mockResolvedValue(
      createShareLinkFixture({ id: 1n, nickName: "게시자닉", name: "게시자이름" })
    );

    const result = await processGetShareContent("token-123", "session-1");

    expect(result.publisherName).toBe("게시자닉");
  });

  test("publisher user.nickName이 없으면 user.name을 사용한다", async () => {
    shareRepo.findShareLinkWithContent.mockResolvedValue(
      createShareLinkFixture({ id: 1n, nickName: null, name: "게시자이름" })
    );

    const result = await processGetShareContent("token-123", "session-1");

    expect(result.publisherName).toBe("게시자이름");
  });

  test("publisher user.nickName/name이 모두 없으면 익명 사용자를 반환한다", async () => {
    shareRepo.findShareLinkWithContent.mockResolvedValue(
      createShareLinkFixture({ id: 1n, nickName: null, name: null })
    );

    const result = await processGetShareContent("token-123", "session-1");

    expect(result.publisherName).toBe("익명 사용자");
  });
});
