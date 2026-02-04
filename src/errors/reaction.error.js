import { BaseError } from "./base.error.js";

export class SlideNotFoundError extends BaseError {
  constructor(data) {
    super("슬라이드를 찾을 수 없습니다.", 404, "R001", data);
  }
}

export class InvalidEmojiTypeError extends BaseError {
  constructor(data) {
    super("유효하지 않은 이모지 타입입니다.", 400, "R002", data);
  }
}

export class ReactionProcessError extends BaseError {
  constructor(data) {
    super("리액션을 처리할 수 없습니다.", 400, "R003", data);
  }
}

export class InvalidReactionParameterError extends BaseError {
  constructor(data) {
    super("요청 파라미터가 올바르지 않습니다.", 400, "R004", data);
  }
}
