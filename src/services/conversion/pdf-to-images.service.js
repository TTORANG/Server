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
import pLimit from "p-limit";

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

  try {
    // GCS → 로컬 다운로드
    await downloadFromGCS({
      bucketName: uf.storageBucket,
      objectKey: uf.storageKey,
      destPath: input,
    });

    await fs.mkdir(outDir, { recursive: true });

    // PDF → PNG 변환
    await runCmd("pdftoppm", ["-png", "-r", String(dpi), input, prefix]);

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
    const limit = pLimit(4);

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

          const meta = await maybeImageMeta(file);

          const objectKey = `${env}/project/${projectId}/slides/${pageNum}/image/${uuid()}.${format}`;
          const uploaded = await uploadToGCS({
            bucketName: uf.storageBucket,
            srcPath: file,
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
