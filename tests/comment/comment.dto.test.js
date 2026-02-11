import {
  commentListItemDTO,
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
      message: "답글이 수정되었습니다.",
      content: "updated",
      userId: "3",
      createdAt: now,
      updatedAt: now,
    });
  });

  test("updateCommentResponseDTO maps comment branch", () => {
    const now = new Date("2026-02-10T05:00:00.000Z");
    const dto = updateCommentResponseDTO({
      id: 10n,
      parentId: null,
      content: "updated comment",
      userId: 3n,
      createdAt: now,
      updatedAt: now,
    });

    expect(dto).toEqual({
      updatedTargetType: "comment",
      commentId: "10",
      message: "댓글이 수정되었습니다.",
      content: "updated comment",
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

  test("commentListItemDTO maps parentCommentId for replies", () => {
    const now = new Date("2026-02-11T00:00:00.000Z");
    const dto = commentListItemDTO({
      id: 22n,
      content: "reply",
      parentId: 10n,
      user: { id: 3n, nickName: "alice" },
      createdAt: now,
      updatedAt: null,
    });

    expect(dto).toEqual({
      commentId: "22",
      content: "reply",
      parentCommentId: "10",
      user: { userId: "3", nickName: "alice" },
      createdAt: now,
      updatedAt: null,
    });
  });
});
