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

export class ShareLinkNotActiveError extends BaseError {
  constructor(data) {
    super("유효하지 않거나 비활성화된 공유 링크입니다.", 403, "L003", data);
  }
}

export class ShareLinkExpiredError extends BaseError {
  constructor(data) {
    super("만료된 공유 링크입니다.", 403, "L004", data);
  }
}

export class ProjectDeletedError extends BaseError {
  constructor(data) {
    super("삭제된 발표입니다.", 403, "L005", data);
  }
}

export class InvalidShareTokenError extends BaseError {
  constructor(data) {
    super("공유 토큰이 유효하지 않습니다. 세션 ID가 아닌 shareToken을 전달해주세요.", 400, "L006", data);
  }
}
