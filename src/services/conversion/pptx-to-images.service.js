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
import {
  ConversionFailedError,
  InvalidFileExtError,
  NoSlidesGeneratedError,
} from "../../errors/conversion.error.js";
import pLimit from "p-limit";

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
  let pdfPath = path.join(workDir, "converted.pdf");

  try {
    await fs.mkdir(path.dirname(input), { recursive: true });
    await fs.mkdir(workDir, { recursive: true });
    await fs.mkdir(outDir, { recursive: true });

    // GCS → 로컬 다운로드
    await downloadFromGCS({
      bucketName: uf.storageBucket,
      objectKey: uf.storageKey,
      destPath: input,
    });

    const SOFFICE =
      process.platform === "win32"
        ? "soffice" // 로컬 Windows (PATH)
        : "/usr/bin/soffice"; // 배포 환경

    // libreoffice 등으로 슬라이드 이미지 변환
    await runCmd(SOFFICE, [
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
    const pdfFiles = (await listFiles(workDir)).filter((f) => f.toLowerCase().endsWith(".pdf"));

    if (pdfFiles.length === 0) {
      throw new ConversionFailedError({
        jobId: job.id,
        step: "pptx_to_pdf",
      });
    }

    pdfPath = pdfFiles[0];

    // PDF → PNG (슬라이드 이미지 생성)
    const prefix = path.join(outDir, "slide");

    const PDFTOPPM =
      process.platform === "win32"
        ? "C:\\poppler\\Library\\bin\\pdftoppm.exe" // 로컬 Windows
        : "/usr/bin/pdftoppm"; // 배포 환경

    await runCmd(PDFTOPPM, ["-png", "-r", "150", pdfPath, prefix]);

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
    const limit = pLimit(4);

    // 슬라이드별 DB 생성 + GCS 업로드
    await Promise.all(
      files.map((file, i) =>
        limit(async () => {
          const slideNum = i + 1;

          const slide = await upsertSlide({
            projectId,
            slideNum,
            sourceIndex: i,
            title: null,
          });

          const meta = await maybeImageMeta(file);
          const objectKey = `${env}/project/${projectId}/slides/${slideNum}/image/${uuid()}.png`;

          const uploaded = await uploadToGCS({
            bucketName: uf.storageBucket,
            srcPath: file,
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
        })
      )
    );

    // 프로젝트 자료 메타데이터 업데이트
    await upsertProjectMaterial({
      projectId,
      uploadedFileId: uf.id,
      fileType: "pptx",
      pageCount: files.length,
    });
    return { ok: true, slideCount: files.length };
  } finally {
    // 임시 파일 정리
    await fs.rm(input, { force: true }).catch(() => {});
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
