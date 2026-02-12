// src/swagger.config.js
import swaggerJSDoc from "swagger-jsdoc";
import { components } from "./swagger/responses.js";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "또랑 서비스 API",
      version: "1.0.0",
      description: "또랑의 서버 API 명세서입니다.",
    },
    servers: [
      {
        url: process.env.SERVER_URL || "https://api.ttorang.com",
        description: "또랑 운영 서버",
      },
      {
        url: "http://localhost:3000",
        description: "로컬 테스트 서버",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT 토큰을 Authorization 헤더에 Bearer 형식으로 입력하세요.",
        },
      },
      ...components,
    },
  },
  apis: ["./src/controllers/*.js", "./src/index.js"],
};

export const specs = swaggerJSDoc(options);
