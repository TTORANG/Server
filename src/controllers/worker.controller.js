import {
  updateJobToProcessing,
  updateJobToCompleted,
  updateJobToFailed,
} from "../repositories/conversionJob.repository.js";

/**
 * Cloud Tasks에서 호출되는 작업 처리 엔드포인트
 * 실제 변환 로직은 conversion.service.js에서 처리
 */
export async function handleProcessJob(req, res) {
  const { conversionJobId, jobType } = req.body;

  if (!conversionJobId || !jobType) {
    return res.status(400).json({ error: "Missing conversionJobId or jobType" });
  }

  try {
    await updateJobToProcessing(conversionJobId);

    // jobType에 따라 적절한 처리 함수 호출
    // switch (jobType) {
    //   case "pptx_to_images":
    //     await processPptxToImages(conversionJobId);
    //     break;
    //   case "pdf_to_images":
    //     await processPdfToImages(conversionJobId);
    //     break;
    //   case "generate_thumbnail":
    //     await processGenerateThumbnail(conversionJobId);
    //     break;
    //   case "extract_metadata":
    //     await processExtractMetadata(conversionJobId);
    //     break;
    //   default:
    //     throw new Error(`Unknown job type: ${jobType}`);
    // }

    await updateJobToCompleted(conversionJobId);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(`Job ${conversionJobId} failed:`, error);

    // 작업 실패 상태로 업데이트 (DB 업데이트 실패해도 200 반환)
    try {
      await updateJobToFailed(conversionJobId, error.message);
    } catch (dbError) {
      console.error(`Failed to update job ${conversionJobId} status:`, dbError);
    }

    // Cloud Tasks가 재시도하지 않도록 200 반환
    // 실패 정보는 DB에 기록됨
    return res.status(200).json({ success: false, error: error.message });
  }
}
