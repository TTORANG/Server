import { BaseError } from "./base.error.js";

export class InvalidUploadError extends BaseError {
  constructor(data = null, message = "잘못된 파일 업로드 요청입니다.") {
    super(message, 400, "F001", data);
  }
}
