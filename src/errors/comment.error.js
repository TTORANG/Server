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
