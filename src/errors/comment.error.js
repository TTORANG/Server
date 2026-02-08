import { BaseError } from "./base.error.js";

export class EmptyCommentContentError extends BaseError {
  constructor() {
    super("댓글 내용을 입력해주세요.", 400, "C001");
  }
}

export class SlideNotFoundError extends BaseError {
  constructor(slideId) {
    super("슬라이드를 찾을 수 없습니다.", 404, "C002", { slideId: slideId?.toString() });
  }
}

export class InvalidSlideIdError extends BaseError {
  constructor(value) {
    super("유효하지 않은 슬라이드 ID입니다.", 400, "C003", { slideId: value });
  }
}

export class InvalidCommentIdError extends BaseError {
  constructor(value) {
    super("유효하지 않은 댓글 ID입니다.", 400, "C004", { commentId: value });
  }
}

export class CommentNotFoundError extends BaseError {
  constructor(commentId) {
    super("댓글을 찾을 수 없습니다.", 404, "C005", {
      commentId: commentId?.toString(),
    });
  }
}

export class NoCommentPermissionError extends BaseError {
  constructor() {
    super("댓글을 수정 또는 삭제할 권한이 없습니다.", 403, "C006");
  }
}

export class NoCommentCreatePermissionError extends BaseError {
  constructor() {
    super("댓글을 작성할 권한이 없습니다.", 403, "C006");
  }
}

export class NoCommentViewPermissionError extends BaseError {
  constructor() {
    super("댓글을 조회할 권한이 없습니다.", 403, "C006");
  }
}

export class CommentListFetchFailedError extends BaseError {
  constructor(slideId) {
    super("댓글을 불러올 수 없습니다.", 500, "C007", {
      slideId: slideId?.toString(),
    });
  }
}
