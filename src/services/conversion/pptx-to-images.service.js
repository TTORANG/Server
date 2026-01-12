import fs from "fs/promises";
import path from "path";
import {
  downloadFromGCS,
  envPrefix,
  getJobWithUploadedFile,
  listFiles,
  maybeImageMeta,
  runCmd,
  tmpPath,
  upsertProjectMaterial,
  upsertSlide,
  uploadToGCS,
  createSlideAsset,
  uuid,
} from "../../utils/conversion.util.js";
import { InvalidFileExtError, NoSlidesGeneratedError } from "../../errors/conversion.error.js";

/**
 * PPTX → 이미지 변환 서비스
 * - PPTX 슬라이드를 이미지로 변환
 * - Slide / SlideAsset 생성
 *
 * jobType: pptx_to_images
 */

export async function pptxToImages(jobOrId) {
  const job = await getJobWithUploadedFile(jobOrId);
  const uf = job.uploadedFile;

  // PPTX 파일만 처리 가능
  if (uf.fileExt !== "pptx") {
    throw new InvalidFileExtError({ fileExt: uf.fileExt });
  }

  // 임시 작업 경로 설정
  const input = tmpPath(`input-${job.id}.pptx`);
  const workDir = tmpPath(`pptx-work-${job.id}`);
  const outDir = path.join(workDir, "out");
  const pdfPath = path.join(workDir, "converted.pdf");

  await fs.mkdir(outDir, { recursive: true });

  // GCS → 로컬 다운로드
  await downloadFromGCS({
    bucketName: uf.storageBucket,
    objectKey: uf.storageKey,
    destPath: input,
  });

  // libreoffice 등으로 슬라이드 이미지 변환
  await runCmd("soffice", [
    "--headless",
    "--nologo",
    "--nofirststartwizard",
    "--convert-to",
    "pdf",
    "--outdir",
    workDir,
    input,
  ]);

  // 생성된 PDF 경로 정리
  const generatedPdf = path.join(workDir, path.basename(input, ".pptx") + ".pdf");
  try {
    await fs.rename(generatedPdf, pdfPath);
  } catch {
    // rename 실패 시 원본 경로 사용
    if (!(await fs.stat(generatedPdf).catch(() => null))) {
      throw new Error("PDF_GENERATION_FAILED");
    }
  }

  // PDF → PNG (슬라이드 이미지 생성)
  const prefix = path.join(outDir, "slide");
  await runCmd("pdftoppm", ["-png", "-r", "150", pdfPath, prefix]);

  // 생성된 슬라이드 이미지 정렬
  const files = (await listFiles(outDir))
    .filter((p) => p.endsWith(".png"))
    .sort((a, b) => {
      const na = Number(a.match(/-(\d+)\.png$/)?.[1] || 0);
      const nb = Number(b.match(/-(\d+)\.png$/)?.[1] || 0);
      return na - nb;
    });

  if (files.length === 0) {
    throw new NoSlidesGeneratedError({ jobId: job.id });
  }

  const projectId = uf.projectId;
  const env = envPrefix();

  // 슬라이드별 DB 생성 + GCS 업로드
  for (let i = 0; i < files.length; i++) {
    const slideNum = i + 1;
    const slide = await upsertSlide({
      projectId,
      slideNum,
      sourceIndex: i,
      title: null,
    });

    const meta = await maybeImageMeta(files[i]);
    const objectKey = `${env}/project/${projectId}/slides/${slideNum}/image/${uuid()}.png`;

    const uploaded = await uploadToGCS({
      bucketName: uf.storageBucket,
      srcPath: files[i],
      objectKey,
      contentType: "image/png",
    });

    await createSlideAsset({
      slideId: slide.id,
      conversionJobId: job.id,
      assetType: "image",
      format: "png",
      width: meta.width,
      height: meta.height,
      sizeBytes: meta.sizeBytes,
      storageBucket: uploaded.storageBucket,
      storageKey: uploaded.storageKey,
      url: uploaded.url,
    });
  }
  // 프로젝트 자료 메타데이터 업데이트
  await upsertProjectMaterial({
    projectId,
    uploadedFileId: uf.id,
    fileType: "pptx",
    pageCount: files.length,
  });

  // 임시 파일 정리
  await fs.rm(input, { force: true }).catch(() => {});
  await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});

  return { ok: true, slideCount: files.length };
}
