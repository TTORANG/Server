import { BaseError } from "./base.error.js";

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

export class UserNotSameError extends BaseError {
  constructor(data) {
    super("본인의 계정만 삭제할 수 있습니다.", 403, "A002", data);
  }
}

export class WithdrawFailedError extends BaseError {
  constructor(data) {
    super("계정 삭제에 실패했습니다. 고객 지원팀에 문의하세요.", 403, "A003", data);
  }
}

export class WithdrawUserError extends BaseError {
  constructor(data) {
    super("탈퇴한 계정입니다. 고객 센터에 문의하세요", 400, "U002", data);
  }
}
