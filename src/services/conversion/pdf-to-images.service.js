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
import { InvalidFileExtError, NoPagesGeneratedError } from "../../errors/conversion.error.js";

/**
 * PDF → 이미지 변환 서비스
 * - PDF 각 페이지를 이미지로 변환
 * - Slide / SlideAsset 생성
 *
 * jobType: pdf_to_images
 */
export async function pdfToImages(jobOrId, opts = {}) {
  const job = await getJobWithUploadedFile(jobOrId);
  const uf = job.uploadedFile;

  // PDF 파일만 처리 가능
  if (uf.fileExt !== "pdf") {
    throw new InvalidFileExtError({ fileExt: uf.fileExt });
  }

  // 변환 옵션
  const dpi = Number(opts.dpi ?? 150);
  const format = "png";
  const assetFormat = "png";
  const contentType = "image/png";

  // 임시 파일/디렉터리 경로
  const input = tmpPath(`input-${job.id}.pdf`);
  const outDir = tmpPath(`pdf-out-${job.id}`);
  const prefix = path.join(outDir, "page");

  // GCS → 로컬 다운로드
  await downloadFromGCS({
    bucketName: uf.storageBucket,
    objectKey: uf.storageKey,
    destPath: input,
  });

  await fs.mkdir(outDir, { recursive: true });

  // pdftoppm으로 PDF → PNG 변환
  // 결과: page-1.png, page-2.png, ...
  await runCmd("pdftoppm", ["-png", "-r", String(dpi), input, prefix]);

  // 생성된 페이지 이미지 정렬
  const files = (await listFiles(outDir))
    .filter((p) => p.endsWith(".png"))
    .sort((a, b) => {
      const na = Number(a.match(/-(\d+)\.png$/)?.[1] || 0);
      const nb = Number(b.match(/-(\d+)\.png$/)?.[1] || 0);
      return na - nb;
    });

  if (files.length === 0) {
    throw new NoPagesGeneratedError({ jobId: job.id });
  }

  const projectId = uf.projectId;
  const env = envPrefix();

  // 페이지별 슬라이드 생성 및 이미지 업로드
  for (let i = 0; i < files.length; i++) {
    const pageNum = i + 1;
    const slide = await upsertSlide({
      projectId,
      slideNum: pageNum,
      sourceIndex: i,
      title: null,
    });

    const meta = await maybeImageMeta(files[i]);

    const objectKey = `${env}/project/${projectId}/slides/${pageNum}/image/${uuid()}.${format}`;
    const uploaded = await uploadToGCS({
      bucketName: uf.storageBucket,
      srcPath: files[i],
      objectKey,
      contentType,
    });

    await createSlideAsset({
      slideId: slide.id,
      conversionJobId: job.id,
      assetType: "image",
      format: assetFormat,
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
    fileType: "pdf",
    pageCount: files.length,
  });

  // 임시 파일 정리
  await fs.rm(input, { force: true }).catch(() => {});
  await fs.rm(outDir, { recursive: true, force: true }).catch(() => {});

  return { ok: true, pageCount: files.length };
}
