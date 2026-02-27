import fs from "fs/promises";
import path from "path";
import { PDFiumLibrary } from "@hyzyla/pdfium";
import { parsePositiveInt } from "../../utils/conversion.util.js";

const DEFAULT_DPI = 150;
const DEFAULT_UPLOAD_CONCURRENCY = 8;
const DEFAULT_SLIDE_IMAGE_POLICY = "near_lossless";
const DEFAULT_SLIDE_JPEG_QUALITY = 95;
const DEFAULT_SLIDE_JPEG_MIN_PNG_BYTES = 2_000_000;
const DEFAULT_SLIDE_JPEG_MIN_SAVING_RATIO = 0.4;

let sharpModulePromise;

const toBoundedNumber = (value, fallback, { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = {}) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
};

const getSharp = async () => {
  if (sharpModulePromise !== undefined) return sharpModulePromise;

  sharpModulePromise = import("sharp")
    .then((mod) => mod.default)
    .catch((error) => {
      throw new Error(`SHARP_LOAD_FAILED: ${error.message}`);
    });

  return sharpModulePromise;
};

export const getConversionUploadConcurrency = () =>
  parsePositiveInt(process.env.CONVERSION_UPLOAD_CONCURRENCY, DEFAULT_UPLOAD_CONCURRENCY);

export const getSlideImagePolicy = () =>
  (process.env.SLIDE_IMAGE_POLICY || DEFAULT_SLIDE_IMAGE_POLICY).trim().toLowerCase();

export const getSlideJpegQuality = () =>
  toBoundedNumber(process.env.SLIDE_JPEG_QUALITY, DEFAULT_SLIDE_JPEG_QUALITY, { min: 1, max: 100 });

export const getSlideJpegMinPngBytes = () =>
  parsePositiveInt(process.env.SLIDE_JPEG_MIN_PNG_BYTES, DEFAULT_SLIDE_JPEG_MIN_PNG_BYTES);

export const getSlideJpegMinSavingRatio = () =>
  toBoundedNumber(process.env.SLIDE_JPEG_MIN_SAVING_RATIO, DEFAULT_SLIDE_JPEG_MIN_SAVING_RATIO, {
    min: 0,
    max: 1,
  });

export const shouldUseNearLosslessJpeg = ({
  policy,
  pngBytes,
  jpegBytes,
  minPngBytes,
  minSavingRatio,
}) => {
  if (policy !== "near_lossless") return false;
  if (!Number.isFinite(pngBytes) || pngBytes <= 0) return false;
  if (!Number.isFinite(jpegBytes) || jpegBytes <= 0) return false;
  if (pngBytes < minPngBytes) return false;

  const savingRatio = (pngBytes - jpegBytes) / pngBytes;
  return savingRatio >= minSavingRatio;
};

const convertDpiToScale = (dpi) => {
  const boundedDpi = toBoundedNumber(dpi, DEFAULT_DPI, { min: 1 });
  return Math.max(1, boundedDpi / 72);
};

const encodeBitmapToPng = async ({ data, width, height }) => {
  const sharp = await getSharp();
  return sharp(Buffer.from(data), {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
};

export async function renderPdfToPngPages({
  inputPdf,
  outDir,
  prefix,
  dpi = DEFAULT_DPI,
}) {
  await fs.mkdir(outDir, { recursive: true });
  const pdfBuffer = await fs.readFile(inputPdf);
  const scale = convertDpiToScale(dpi);

  let library;
  let document;
  const files = [];
  try {
    library = await PDFiumLibrary.init();
    document = await library.loadDocument(pdfBuffer);

    const pageCount = document.getPageCount();
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      const page = document.getPage(pageIndex);
      const rendered = await page.render({
        scale,
        render: encodeBitmapToPng,
      });

      const outputPath = `${prefix}-${pageIndex + 1}.png`;
      await fs.writeFile(outputPath, Buffer.from(rendered.data));
      files.push(outputPath);
    }

    return files;
  } finally {
    if (document) {
      try {
        document.destroy();
      } catch {}
    }
    if (library) {
      try {
        library.destroy();
      } catch {}
    }
  }
}

export async function chooseSlideImageUploadSource({
  pngPath,
  workDir,
  slideNum,
  jobId,
  jobType,
}) {
  const defaultSelection = {
    srcPath: pngPath,
    format: "png",
    extension: "png",
    contentType: "image/png",
    cleanupPaths: [],
  };

  const policy = getSlideImagePolicy();
  if (policy !== "near_lossless") return defaultSelection;

  const sharp = await getSharp();

  const pngStat = await fs.stat(pngPath);
  const minPngBytes = getSlideJpegMinPngBytes();
  if (pngStat.size < minPngBytes) return defaultSelection;

  const jpegPath = path.join(workDir, `slide-${String(slideNum).padStart(5, "0")}.jpeg`);

  try {
    await sharp(pngPath)
      .jpeg({
        quality: getSlideJpegQuality(),
        mozjpeg: true,
        chromaSubsampling: "4:4:4",
      })
      .toFile(jpegPath);

    const jpegStat = await fs.stat(jpegPath);
    const useJpeg = shouldUseNearLosslessJpeg({
      policy,
      pngBytes: pngStat.size,
      jpegBytes: jpegStat.size,
      minPngBytes,
      minSavingRatio: getSlideJpegMinSavingRatio(),
    });

    if (!useJpeg) {
      await fs.rm(jpegPath, { force: true }).catch(() => {});
      return defaultSelection;
    }

    return {
      srcPath: jpegPath,
      format: "jpeg",
      extension: "jpeg",
      contentType: "image/jpeg",
      cleanupPaths: [jpegPath],
    };
  } catch (error) {
    await fs.rm(jpegPath, { force: true }).catch(() => {});
    console.warn(
      `[Conversion] slide image policy fallback to png (job=${jobId}, slide=${slideNum}): ${error.message}`
    );
    return defaultSelection;
  }
}
