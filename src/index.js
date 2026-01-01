import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { Storage } from "@google-cloud/storage";

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors()); // cors 방식 허용
app.use(express.static("public")); // 정적 파일 접근
app.use(express.json()); // request의 본문을 json으로 해석할 수 있도록 함 (JSON 형태의 요청 body를 파싱하기 위함)
app.use(express.urlencoded({ extended: false })); // 단순 객체 문자열 형태로 본문 데이터 해석

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME;

async function testGCS() {
  const file = storage.bucket(bucketName).file("permission-test.txt");

  await file.save("ok");
  await file.delete();
  console.log("GCS 연결 성공");
}

testGCS().catch((err) => {
  console.error("GCS 연결 실패");
  console.error(err.message);
});
