import fs from "fs/promises";
import {
  envPrefix,
  getJobWithUploadedFile,
  maybeImageMeta,
  tmpPath,
  uploadToGCS,
  uuid,
  createSlideAsset,
  updateProjectThumbnail,
  downloadFromGCS,
} from "../../utils/conversion.util.js";
import { SlideImageNotFoundError, SlideNotFoundError } from "../../errors/conversion.error.js";
import { prisma } from "../../db.config.js";

/**
 * 썸네일 생성 서비스
 * - 특정 슬라이드의 이미지를 기반으로 썸네일 생성
 * - 보통 첫 번째 슬라이드를 기준으로 사용
 *
 * jobType: generate_thumbnail
 */

export async function generateThumbnail(jobOrId, opts = {}) {
  const job = await getJobWithUploadedFile(jobOrId);
  const uf = job.uploadedFile;
  const projectId = uf.projectId;

  // thumbnail 기준: ProjectMaterial.thumbnailSlideNum 있으면 해당 데이터, 없으면 1
  const pm = await prisma.projectMaterial.findFirst({
    where: { uploadedFileId: uf.id },
  });

  const slideNum = pm?.thumbnailSlideNum ?? 1;

  // 썸네일 대상 슬라이드 조회
  const slide = await prisma.slide.findFirst({
    where: { projectId, slideNum: BigInt(slideNum), isDeleted: false },
    orderBy: { id: "asc" },
  });
  if (!slide) {
    throw new SlideNotFoundError({ projectId, slideNum });
  }

  // 해당 슬라이드의 이미지 asset 조회
  const imageAsset = await prisma.slideAsset.findFirst({
    where: { slideId: slide.id, assetType: "image" },
    orderBy: { id: "asc" },
  });
  if (!imageAsset) {
    throw new SlideImageNotFoundError({ slideId: slide.id });
  }

  // 다운로드 후(가능하면) 리사이즈해서 업로드
  const tmpIn = tmpPath(`thumb-in-${job.id}.png`);
  const tmpOut = tmpPath(`thumb-out-${job.id}.png`);

  try {
    // ✅ GCS 다운로드 유틸 재사용
    await downloadFromGCS({
      bucketName: imageAsset.storageBucket,
      objectKey: imageAsset.storageKey,
      destPath: tmpIn,
    });

    let outPath = tmpIn;

    // sharp 있으면 resize
    try {
      const sharp = (await import("sharp")).default;
      await sharp(tmpIn)
        .resize({ width: Number(opts.width ?? 512) })
        .png()
        .toFile(tmpOut);
      outPath = tmpOut;
    } catch {
      outPath = tmpIn;
    }

    const meta = await maybeImageMeta(outPath);
    const env = envPrefix();

    const objectKey = `${env}/project/${projectId}/thumbnail/${uuid()}.png`;
    const uploaded = await uploadToGCS({
      bucketName: imageAsset.storageBucket,
      srcPath: outPath,
      objectKey,
      contentType: "image/png",
    });

    // 기존 thumbnail 제거
    await prisma.slideAsset.deleteMany({
      where: {
        slideId: slide.id,
        assetType: "thumbnail",
      },
    });

    const thumbAsset = await createSlideAsset({
      slideId: slide.id,
      conversionJobId: job.id,
      assetType: "thumbnail",
      format: "png",
      width: meta.width,
      height: meta.height,
      sizeBytes: meta.sizeBytes,
      storageBucket: uploaded.storageBucket,
      storageKey: uploaded.storageKey,
      url: uploaded.url,
    });

    await updateProjectThumbnail(projectId, uploaded.url);

    return {
      ok: true,
      slideNum,
      thumbnailAssetId: thumbAsset.id,
      thumbnailUrl: uploaded.url,
    };
  } finally {
    // ✅ fs.rm으로 통일
    await fs.rm(tmpIn, { force: true }).catch(() => {});
    await fs.rm(tmpOut, { force: true }).catch(() => {});
  }
}
