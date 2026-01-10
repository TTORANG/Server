class BaseError extends Error {
  constructor(message, status, errorCode, data = null) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
    this.reason = message;
    this.data = data;
  }
}

// 세션을 찾을 수 없는 경우 (병합 시 잘못된 ID를 보냈을 때)
export class SessionNotFoundError extends BaseError {
  constructor(data) {
    super("해당 세션을 찾을 수 없거나 이미 만료되었습니다.", 404, "S001", data);
  }
}

// 병합할 데이터가 없는 경우 (선택적 사용)
export class NoDataToMergeError extends BaseError {
  constructor(data) {
    super("병합할 익명 데이터가 존재하지 않습니다.", 400, "S002", data);
  }
}

// 본인 세션이 아니거나 권한이 없는 경우
export class SessionAccessDeniedError extends BaseError {
  constructor(data) {
    super("해당 세션에 접근할 권한이 없습니다.", 403, "S003", data);
  }
}
