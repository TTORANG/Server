import { jest } from "@jest/globals";

const mockCreateSlideComment = jest.fn();
const mockCreateVideoComment = jest.fn();
const mockUpdateComment = jest.fn();
const mockGetAllVideoComments = jest.fn();

jest.unstable_mockModule("../../src/services/comment.service.js", () => ({
  createSlideComment: mockCreateSlideComment,
  createVideoComment: mockCreateVideoComment,
  updateComment: mockUpdateComment,
  deleteComment: jest.fn(),
  getSlideComments: jest.fn(),
  getVideoCommentsByTimestamp: jest.fn(),
  getAllVideoComments: mockGetAllVideoComments,
}));

const {
  postSlideComment,
  handleCreateVideoComment,
  patchComment,
  getAllVideoCommentsController,
} = await import("../../src/controllers/comment.controller.js");

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("comment.controller QA cases", () => {
  beforeEach(() => {
    mockCreateSlideComment.mockReset();
    mockCreateVideoComment.mockReset();
    mockUpdateComment.mockReset();
    mockGetAllVideoComments.mockReset();
  });

  test("postSlideComment forwards error for invalid slideId", async () => {
    const req = { params: { slideId: "abc" }, body: { content: "hi" }, user: { id: 1n } };
    const res = createRes();
    const next = jest.fn();

    await postSlideComment(req, res, next);

    expect(mockCreateSlideComment).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  test("handleCreateVideoComment forwards error when user is missing", async () => {
    const req = { params: { videoId: "1" }, body: { content: "x", timestampMs: 1000 } };
    const res = createRes();
    const next = jest.fn();

    await handleCreateVideoComment(req, res, next);

    expect(mockCreateVideoComment).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  test("patchComment forwards service error", async () => {
    const error = new Error("update failed");
    mockUpdateComment.mockRejectedValue(error);

    const req = {
      params: { commentId: "10" },
      body: { content: "updated" },
      user: { id: 1n },
    };
    const res = createRes();
    const next = jest.fn();

    await patchComment(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  test("getAllVideoCommentsController returns share-comment-shaped payload", async () => {
    mockGetAllVideoComments.mockResolvedValue([
      {
        id: 1n,
        content: "이 부분 설명이 아주 좋네요!",
        userId: 12n,
        user: { nickName: "가넷" },
        targetType: "video",
        targetId: 456n,
        parentId: 2n,
        timestampMs: 12000,
        createdAt: new Date("2026-02-10T15:00:00.000Z"),
      },
    ]);

    const req = { params: { videoId: "456" }, user: { id: 12n } };
    const res = createRes();
    const next = jest.fn();

    await getAllVideoCommentsController(req, res, next);

    expect(mockGetAllVideoComments).toHaveBeenCalledWith({ videoId: "456" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      resultType: "SUCCESS",
      error: null,
      success: {
        comments: [
          {
            commentId: "1",
            content: "이 부분 설명이 아주 좋네요!",
            userId: "12",
            isMine: true,
            writer: "가넷",
            targetType: "video",
            targetId: "456",
            parentId: "2",
            timestampMs: 12000,
            createdAt: new Date("2026-02-10T15:00:00.000Z"),
          },
        ],
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("getAllVideoCommentsController forwards service error", async () => {
    const error = new Error("fetch failed");
    mockGetAllVideoComments.mockRejectedValue(error);

    const req = { params: { videoId: "456" }, user: { id: 12n } };
    const res = createRes();
    const next = jest.fn();

    await getAllVideoCommentsController(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
