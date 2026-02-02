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
    SocialLoginSuccess: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "소셜 로그인 성공!",
        },
        user: {
          type: "object",
          properties: {
            id: { type: "string", example: "123" },
            email: { type: "string", example: "user@example.com" },
            name: { type: "string", example: "홍길동" },
            sessionId: { type: "string", example: "106fbf2c-3357-40f7-..." },
          },
        },
        tokens: {
          type: "object",
          properties: {
            accessToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIs..." },
            refreshToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIs..." },
          },
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
            data: { type: "string", example: "null" },
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
    SocialLoginSuccess: {
      description: "소셜 로그인 성공",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/SuccessResponse",
          },
          example: {
            resultType: "SUCCESS",
            error: null,
            success: {
              message: "소셜 로그인 성공!",
              user: {
                id: "123",
                email: "user@example.com",
                name: "홍길동",
                sessionId: "106fbf2c-3357-40f7-...",
              },
              tokens: { accessToken: "eyJhbGci...", refreshToken: "eyJhbGci..." },
            },
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
