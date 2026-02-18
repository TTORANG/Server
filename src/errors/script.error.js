import { BaseError } from "./base.error.js";

export class ScriptNotFoundError extends BaseError {
  constructor(data) {
    super("대본이 존재하지 않습니다", 404, "SC001", data);
  }
}

export class VersionNotFoundError extends BaseError {
  constructor(data) {
    super("버전이 존재하지 않습니다.", 404, "SC002", data);
  }
}

export class ScriptBulkEditPayloadError extends BaseError {
  constructor(data) {
    super("유효한 대본 목록이 필요합니다.", 400, "SC003", data);
  }
}

export class ScriptBulkEditDuplicateSlideError extends BaseError {
  constructor(data) {
    super("중복된 슬라이드 ID가 포함되어 있습니다.", 400, "SC004", data);
  }
}

export class ScriptBulkEditSlideNotFoundError extends BaseError {
  constructor(data) {
    super("프로젝트에 속하지 않은 슬라이드가 포함되어 있습니다.", 400, "SC005", data);
  }
}
