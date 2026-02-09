import { processJob } from "../services/conversionJob.service.js";

/**
 * Cloud Tasks에서 호출되는 작업 처리 엔드포인트
 * HTTP 요청/응답 처리만 담당
 */
export const handleProcessJob = async (req, res) => {
  const { conversionJobId, jobType } = req.body;

  if (!conversionJobId || !jobType) {
    return res.status(400).json({ error: "Missing conversionJobId or jobType" });
  }

  const result = await processJob(conversionJobId, jobType);

  // Cloud Tasks가 재시도하지 않도록 항상 200 반환
  // 실패 정보는 DB에 기록됨
  return res.status(200).json(result);
};
