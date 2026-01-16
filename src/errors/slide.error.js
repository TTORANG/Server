import { BaseError } from "./base.error.js";

export class SlideNotFoundError extends BaseError {
  constructor(data) {
    super("해당 슬라이드를 찾을 수 없습니다", 404, "S001", data);
  }
}

export class SlideAccessDeniedError extends BaseError {
  constructor(data) {
    super("이 슬라이드에 접근할 권한이 없습니다.", 403, "S002", data);
  }
}
