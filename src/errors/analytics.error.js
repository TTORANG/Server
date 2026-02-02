import { BaseError } from "./base.error.js";

export class AnalyticsProjectNotFoundError extends BaseError {
  constructor(data = null) {
    super("프로젝트를 찾을 수 없습니다.", 404, "AN001", data);
  }
}

export class AnalyticsVideoNotFoundError extends BaseError {
  constructor(data = null) {
    super("영상을 찾을 수 없습니다.", 404, "AN002", data);
  }
}

export class AnalyticsSlideNotFoundError extends BaseError {
  constructor(data = null) {
    super("슬라이드를 찾을 수 없습니다.", 404, "AN003", data);
  }
}

export class AnalyticsInvalidParameterError extends BaseError {
  constructor(data = null, message = "요청 파라미터가 올바르지 않습니다.") {
    super(message, 400, "AN004", data);
  }
}

export class AnalyticsSessionRequiredError extends BaseError {
  constructor(data = null) {
    super("세션 정보가 필요합니다.", 401, "AN005", data);
  }
}