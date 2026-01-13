import { getJobWithUploadedFile, upsertProjectMaterial } from "../../utils/conversion.util.js";
import { SlidesNotReadyError } from "../../errors/conversion.error.js";
import { prisma } from "../../db.config.js";

/**
 * 메타데이터 추출 서비스
 * - 슬라이드 변환 완료 여부 확인
 * - 프로젝트 자료(ProjectMaterial)에 페이지 수, 썸네일 정보 등 저장
 *
 * Cloud Task 워커에서 호출
 * (jobType: extract_metadata)
 */
export async function extractMetadata(jobOrId) {
  // ConversionJob + UploadedFile 함께 조회
  const job = await getJobWithUploadedFile(jobOrId);
  const uf = job.uploadedFile;

  // 해당 프로젝트에 생성된 슬라이드 개수 확인
  const slideCount = await prisma.slide.count({
    where: {
      projectId: uf.projectId,
      isDeleted: false,
      assets: { some: { assetType: "image" } },
    },
  });

  // 슬라이드가 아직 생성되지 않은 경우 → 선행 작업 미완료
  if (!slideCount) {
    throw new SlidesNotReadyError({ projectId: uf.projectId });
  }

  // ProjectMaterial 테이블에 메타데이터 upsert
  // (pptx / pdf 공통)
  await upsertProjectMaterial({
    projectId: uf.projectId,
    uploadedFileId: uf.id,
    fileType: uf.fileExt, // "pptx" | "pdf"
    pageCount: slideCount,
  });

  return { ok: true, pageCount: slideCount };
}
