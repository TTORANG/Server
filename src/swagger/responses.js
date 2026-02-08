export const components = {
  schemas: {
    SuccessResponse: {
      type: "object",
      properties: {
        resultType: {
          type: "string",
          enum: ["SUCCESS"],
          example: "SUCCESS",
        },
        error: {
          type: "null",
          example: null,
        },
        success: {
          type: "object",
        },
      },
    },
    FailureResponse: {
      type: "object",
      properties: {
        resultType: {
          type: "string",
          enum: ["FAILURE"],
          example: "FAILURE",
        },
        error: {
          type: "object",
          properties: {
            errorCode: { type: "string", example: "A001" },
            reason: { type: "string", example: "에러 메시지" },
            data: {
              type: "object",
              nullable: true,
              example: null,
            },
          },
        },
        success: {
          type: "null",
          example: null,
        },
      },
    },
  },
  // 공통 응답
  responses: {
    SocialLoginRedirect: {
      description: "소셜 로그인 성공 (프론트엔드 성공 페이지로 리다이렉트)",
      headers: {
        Location: {
          schema: {
            type: "string",
            description: "토큰과 세션 ID가 포함된 프론트엔드 URL",
            example:
              "https://ttorang.com/auth/callback?accessToken=...&refreshToken=...&sessionId=...",
          },
        },
      },
    },
    AuthFailure: {
      description: "인증 실패",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/FailureResponse",
          },
          examples: {
            EmailNotFound: {
              summary: "프로필 이메일 없음 (A001)",
              value: {
                resultType: "FAILURE",
                error: {
                  errorCode: "A001",
                  reason: "프로필 이메일을 찾을 수 없습니다.",
                  data: null,
                },
                success: null,
              },
            },
            WithdrawUser: {
              summary: "탈퇴 계정 (U002)",
              value: {
                resultType: "FAILURE",
                error: { errorCode: "U002", reason: "탈퇴한 계정입니다.", data: null },
                success: null,
              },
            },
          },
        },
      },
    },
  },
};
