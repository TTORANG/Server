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
import {
  applyNotesToProjectSlides,
  extractSlideNotesFromPptxPath,
} from "./pptxNotes.service.js";
import {
  chooseSlideImageUploadSource,
  getConversionUploadConcurrency,
  renderPdfToPngPages,
} from "./slideImageConversion.util.js";

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
  const jobId = job.id.toString();

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
    ], {
      logMeta: {
        jobId,
        jobType: "pptx_to_images",
        stage: "pptx_to_images.pptx_to_pdf",
      },
    });

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

    const files = await renderPdfToPngPages({
      inputPdf: pdfPath,
      outDir,
      prefix,
      dpi: 150,
      jobId,
      jobType: "pptx_to_images",
      stageBase: "pptx_to_images.pdf_to_images",
    });

    if (files.length === 0) {
      throw new NoSlidesGeneratedError({ jobId: job.id });
    }

    const projectId = uf.projectId;
    const env = envPrefix();
    const limit = pLimit(getConversionUploadConcurrency());

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

          const selected = await chooseSlideImageUploadSource({
            pngPath: file,
            workDir: outDir,
            slideNum,
            jobId,
            jobType: "pptx_to_images",
          });
          const meta = await maybeImageMeta(selected.srcPath);
          const objectKey = `${env}/project/${projectId}/slides/${slideNum}/image/${uuid()}.${selected.extension}`;

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

    // 프로젝트 자료 메타데이터 업데이트
    await upsertProjectMaterial({
      projectId,
      uploadedFileId: uf.id,
      fileType: "pptx",
      pageCount: files.length,
    });

    const notesSummary = {
      notesDetected: 0,
      scriptsApplied: 0,
      scriptsSkippedExisting: 0,
      notesUnmatched: 0,
    };

    try {
      const notesMap = await extractSlideNotesFromPptxPath(input);
      notesSummary.notesDetected = notesMap.size;

      const applied = await applyNotesToProjectSlides({
        projectId,
        notesMap,
      });

      notesSummary.scriptsApplied = applied.appliedCount;
      notesSummary.scriptsSkippedExisting = applied.skippedExistingCount;
      notesSummary.notesUnmatched = applied.unmatchedCount;
    } catch (error) {
      console.warn(`[PPTX Notes] failed for project ${projectId}:`, error.message);
    }

    console.log(`[PPTX Notes] project ${projectId} summary:`, notesSummary);
    return { ok: true, slideCount: files.length };
  } finally {
    // 임시 파일 정리
    await fs.rm(input, { force: true }).catch(() => {});
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
