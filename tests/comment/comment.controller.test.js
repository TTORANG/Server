import { jest } from "@jest/globals";

const mockCreateSlideComment = jest.fn();
const mockCreateVideoComment = jest.fn();
const mockUpdateComment = jest.fn();

jest.unstable_mockModule("../../src/services/comment.service.js", () => ({
  createSlideComment: mockCreateSlideComment,
  createVideoComment: mockCreateVideoComment,
  updateComment: mockUpdateComment,
  deleteComment: jest.fn(),
  getSlideComments: jest.fn(),
  getVideoCommentsByTimestamp: jest.fn(),
}));

const {
  postSlideComment,
  handleCreateVideoComment,
  patchComment,
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
});
