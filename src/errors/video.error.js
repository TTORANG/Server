import { BaseError } from "./base.error.js";

export class VideoNotFoundError extends BaseError {
  constructor(data = null) {
    super("영상을 찾을 수 없습니다.", 404, "V001", data);
  }
}

export class InvalidVideoStatusError extends BaseError {
  constructor(data = null) {
    super("비디오 상태가 올바르지 않습니다.", 409, "V002", data);
  }
}

export class NoVideoChunksError extends BaseError {
  constructor(data = null) {
    super("업로드된 비디오 청크가 없습니다.", 400, "V003", data);
  }
}

export class InvalidVideoChunkError extends BaseError {
  constructor(data = null) {
    super("비디오 청크 정보가 올바르지 않습니다.", 400, "V004", data);
  }
}

export class VideoEncodingFailedError extends BaseError {
  constructor(data = null) {
    super("영상 인코딩에 실패했습니다.", 500, "V005", data);
  }
}
