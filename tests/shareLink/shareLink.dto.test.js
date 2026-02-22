import { getShareLinkResponseDTO } from "../../src/dtos/shareLink.dto.js";

describe("shareLink.dto", () => {
  test("shareInfo에 publisherName을 포함하고 기존 구조를 유지한다", () => {
    const createdAt = new Date("2026-02-12T10:00:00.000Z");
    const response = getShareLinkResponseDTO({
      scope: "slides_script",
      publisherName: "발표자 닉네임",
      content: {
        title: "테스트 발표",
        slides: [],
        comments: [],
      },
      shareLink: {
        shareToken: "token-123",
        createdAt,
      },
      currentUserId: null,
      sessionId: "session-1",
      sessionName: "조회자",
      tokens: null,
    });

    expect(response.shareInfo).toEqual({
      shareToken: "token-123",
      scope: "slides_script",
      createdAt,
      publisherName: "발표자 닉네임",
    });

    expect(response.presentationContent).toEqual({
      title: "테스트 발표",
      slides: [],
      video: null,
      comments: [],
    });
  });
});
