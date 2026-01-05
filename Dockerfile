FROM node:20-alpine

WORKDIR /app

#해당 파일이 안바뀌면(설정이 안바뀌면)
COPY package*.json ./ 

# 의존성 설치 (devDependencies 포함 - prisma 필요)
RUN npm ci

# Prisma 스키마 복사 및 클라이언트 생성
COPY prisma ./prisma
RUN npx prisma generate

#소스코드만 바뀌었을시에 여기서부터 빠르게 실행한다.
COPY . .

EXPOSE 8080

CMD [ "npm", "start" ]