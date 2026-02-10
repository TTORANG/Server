import {
  createSlideCommentRequestDTO,
  createCommentReplyRequestDTO,
  deleteCommentResponseDTO,
  updateCommentResponseDTO,
} from "../../src/dtos/comment.dto.js";

describe("comment.dto", () => {
  test("createSlideCommentRequestDTO trims content", () => {
    expect(createSlideCommentRequestDTO({ content: "  hello  " })).toEqual({ content: "hello" });
  });

  test("createCommentReplyRequestDTO returns empty content for non-string", () => {
    expect(createCommentReplyRequestDTO({ content: null })).toEqual({ content: "" });
  });

  test("updateCommentResponseDTO maps reply branch", () => {
    const now = new Date("2026-02-10T05:00:00.000Z");
    const dto = updateCommentResponseDTO({
      id: 22n,
      parentId: 10n,
      content: "updated",
      userId: 3n,
      createdAt: now,
      updatedAt: now,
    });

    expect(dto).toEqual({
      updatedTargetType: "reply",
      parentCommentId: "10",
      replyId: "22",
      content: "updated",
      userId: "3",
      createdAt: now,
      updatedAt: now,
    });
  });

  test("deleteCommentResponseDTO maps comment branch", () => {
    expect(deleteCommentResponseDTO({ commentId: 11n, parentCommentId: null })).toEqual({
      deletedTargetType: "comment",
      commentId: "11",
    });
  });
});
