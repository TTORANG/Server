class BaseError extends Error {
  constructor(message, status, errorCode, data = null) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
    this.reason = message;
    this.data = data;
  }
}

export class EmailNotFoundError extends BaseError {
  constructor(data) {
    super("프로필 이메일을 찾을 수 없습니다.", 400, "A001", data);
  }
}

export class UserNotFoundError extends BaseError {
  constructor(data) {
    super("존재하지 않는 사용자입니다.", 404, "U001", data);
  }
}
