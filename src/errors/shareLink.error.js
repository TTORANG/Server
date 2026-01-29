import { BaseError } from "./base.error.js";

export class VideoNotFoundError extends BaseError {
  constructor(data) {
    super("해당 프로젝트에서 유효한 영상을 찾을 수 없습니다.", 404, "L001", data);
  }
}

export class VideoIdRequiredError extends BaseError {
  constructor(data) {
    super("영상을 포함하려면 영상 ID가 필수입니다.", 400, "L002", data);
  }
}
