FROM node:20-alpine

WORKDIR /app

#해당 파일이 안바뀌면(설정이 안바뀌면)
COPY package*.json ./ 

#캐시 사용
RUN npm ci --only=production

#소스코드만 바뀌었을시에 여기서부터 빠르게 실행한다.
COPY . .

EXPOSE 8080

CMD [ "npm", "start" ]