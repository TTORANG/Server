import { BaseError } from "./base.error.js";

export class ProjectNotFoundError extends BaseError {
  constructor(data) {
    super("해당 프로젝트를 찾을 수 없습니다.", 404, "P001", data);
  }
}

export class FileNotAttachedError extends BaseError {
  constructor(data) {
    super("연결된 파일 정보가 올바르지 않습니다", 400, "P002", data);
  }
}
