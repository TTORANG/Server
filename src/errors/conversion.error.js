import { BaseError } from "./base.error.js";

export class ConversionFailedError extends BaseError {
  constructor(data = null, message = "파일 변환에 실패했습니다.") {
    super(message, 500, "C001", data);
  }
}

export class InvalidFileExtError extends BaseError {
  constructor(data = null) {
    super("지원하지 않는 파일 형식입니다.", 400, "C002", data);
  }
}

export class SlideNotFoundError extends BaseError {
  constructor(data = null) {
    super("슬라이드를 찾을 수 없습니다.", 404, "C003", data);
  }
}

export class NoPagesGeneratedError extends BaseError {
  constructor(data = null) {
    super("페이지 변환 결과가 없습니다.", 500, "C004", data);
  }
}

export class NoSlidesGeneratedError extends BaseError {
  constructor(data = null) {
    super("슬라이드 변환 결과가 없습니다.", 500, "C005", data);
  }
}

export class SlideImageNotFoundError extends BaseError {
  constructor(data = null) {
    super("슬라이드 이미지가 존재하지 않습니다.", 404, "C006", data);
  }
}

export class SlidesNotReadyError extends BaseError {
  constructor(data = null) {
    super("슬라이드가 아직 생성되지 않았습니다.", 409, "C007", data);
  }
}
