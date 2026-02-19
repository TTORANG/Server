import fs from "fs/promises";
import path from "path";
import {
  downloadFromGCS,
  envPrefix,
  getJobWithUploadedFile,
  maybeImageMeta,
  tmpPath,
  upsertProjectMaterial,
  upsertSlide,
  uploadToGCS,
  createSlideAsset,
  uuid,
} from "../../utils/conversion.util.js";
import { InvalidFileExtError, NoPagesGeneratedError } from "../../errors/conversion.error.js";
import pLimit from "p-limit";
import {
  chooseSlideImageUploadSource,
  getConversionUploadConcurrency,
  renderPdfToPngPages,
} from "./slideImageConversion.util.js";

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
  const jobId = job.id.toString();

  // PDF 파일만 처리 가능
  if (uf.fileExt !== "pdf") {
    throw new InvalidFileExtError({ fileExt: uf.fileExt });
  }

  // 변환 옵션
  const dpi = Number(opts.dpi ?? 150);

  // 임시 파일/디렉터리 경로
  const input = tmpPath(`input-${job.id}.pdf`);
  const outDir = tmpPath(`pdf-out-${job.id}`);
  const prefix = path.join(outDir, "page");

  try {
    await fs.mkdir(path.dirname(input), { recursive: true });
    await fs.mkdir(outDir, { recursive: true });

    // GCS → 로컬 다운로드
    await downloadFromGCS({
      bucketName: uf.storageBucket,
      objectKey: uf.storageKey,
      destPath: input,
    });

    const files = await renderPdfToPngPages({
      inputPdf: input,
      outDir,
      prefix,
      dpi,
      jobId,
      jobType: "pdf_to_images",
      stageBase: "pdf_to_images.render",
    });

    if (files.length === 0) {
      throw new NoPagesGeneratedError({ jobId: job.id });
    }

    const projectId = uf.projectId;
    const env = envPrefix();
    const limit = pLimit(getConversionUploadConcurrency());

    await Promise.all(
      files.map((file, i) =>
        limit(async () => {
          const pageNum = i + 1;

          const slide = await upsertSlide({
            projectId,
            slideNum: pageNum,
            sourceIndex: i,
            title: null,
          });

          const selected = await chooseSlideImageUploadSource({
            pngPath: file,
            workDir: outDir,
            slideNum: pageNum,
            jobId,
            jobType: "pdf_to_images",
          });
          const meta = await maybeImageMeta(selected.srcPath);

          const objectKey = `${env}/project/${projectId}/slides/${pageNum}/image/${uuid()}.${selected.extension}`;
          const uploaded = await uploadToGCS({
            bucketName: uf.storageBucket,
            srcPath: selected.srcPath,
            objectKey,
            contentType: selected.contentType,
          });

          await createSlideAsset({
            slideId: slide.id,
            conversionJobId: job.id,
            assetType: "image",
            format: selected.format,
            width: meta.width,
            height: meta.height,
            sizeBytes: meta.sizeBytes,
            storageBucket: uploaded.storageBucket,
            storageKey: uploaded.storageKey,
            url: uploaded.url,
          });

          await Promise.all(
            selected.cleanupPaths.map((cleanupPath) =>
              fs.rm(cleanupPath, { force: true }).catch(() => {})
            )
          );
        })
      )
    );

    await upsertProjectMaterial({
      projectId,
      uploadedFileId: uf.id,
      fileType: "pdf",
      pageCount: files.length,
    });

    return { ok: true, pageCount: files.length };
  } finally {
    // 성공/실패 여부와 무관하게 항상 정리
    await fs.rm(input, { force: true }).catch(() => {});
    await fs.rm(outDir, { recursive: true, force: true }).catch(() => {});
  }
}
