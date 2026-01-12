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
} from "../../utils/conversion.util.js";
import { SlideImageNotFoundError, SlideNotFoundError } from "../../errors/conversion.error.js";
import { prisma } from "../../db.config.js";
4;

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

  // GCS에서 읽어오는 부분: gs:// URL만 저장 중이므로 bucket/key 사용
  // imageAsset.storageBucket / storageKey 기준
  const { Storage } = await import("@google-cloud/storage");
  const storage = new Storage();
  await storage
    .bucket(imageAsset.storageBucket)
    .file(imageAsset.storageKey)
    .download({ destination: tmpIn });

  let outPath = tmpIn;

  // sharp가 있으면 리사이즈
  try {
    const sharp = (await import("sharp")).default;
    await sharp(tmpIn)
      .resize({ width: Number(opts.width ?? 512) })
      .png()
      .toFile(tmpOut);
    outPath = tmpOut;
  } catch {
    // sharp 없으면 원본 그대로 thumbnail로 사용
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

  // 썸네일 중복 생성 방지
  await prisma.slideAsset.deleteMany({
    where: {
      slideId: slide.id,
      assetType: "thumbnail",
    },
  });

  // SlideAsset(thumbnail) 생성
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

  // Project.thumbnailUrl 반영
  await updateProjectThumbnail(projectId, uploaded.url);

  // 임시 파일 정리
  await fs.unlink(tmpIn).catch(() => {});
  await fs.unlink(tmpOut).catch(() => {});

  return { ok: true, slideNum, thumbnailAssetId: thumbAsset.id, thumbnailUrl: uploaded.url };
}
