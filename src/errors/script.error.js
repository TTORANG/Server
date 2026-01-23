import { BaseError } from "./base.error.js";

export class ScriptNotFoundError extends BaseError {
  constructor(data) {
    super("대본이 존재하지 않습니다", 404, "SC001", data);
  }
}
