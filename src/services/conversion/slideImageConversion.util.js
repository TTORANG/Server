import fs from "fs/promises";
import { readFileSync } from "fs";
import os from "os";
import path from "path";
import pLimit from "p-limit";
import { listFiles, parsePositiveInt, runCmd } from "../../utils/conversion.util.js";

const DEFAULT_DPI = 150;
const DEFAULT_PDF_RENDER_BACKEND = "auto";
const DEFAULT_UPLOAD_CONCURRENCY = 8;
const DEFAULT_SLIDE_IMAGE_POLICY = "near_lossless";
const DEFAULT_SLIDE_JPEG_QUALITY = 95;
const DEFAULT_SLIDE_JPEG_MIN_PNG_BYTES = 2_000_000;
const DEFAULT_SLIDE_JPEG_MIN_SAVING_RATIO = 0.4;

let sharpModulePromise;

const getCgroupCpuCount = () => {
  try {
    const cpuMax = readFileSync("/sys/fs/cgroup/cpu.max", "utf8").trim();
    const [quotaRaw, periodRaw] = cpuMax.split(" ");

    if (quotaRaw && periodRaw && quotaRaw !== "max") {
      const quota = Number(quotaRaw);
      const period = Number(periodRaw);
      if (Number.isFinite(quota) && Number.isFinite(period) && quota > 0 && period > 0) {
        return Math.max(1, Math.floor(quota / period));
      }
    }
  } catch {}

  try {
    const quota = Number(readFileSync("/sys/fs/cgroup/cpu/cpu.cfs_quota_us", "utf8").trim());
    const period = Number(readFileSync("/sys/fs/cgroup/cpu/cpu.cfs_period_us", "utf8").trim());

    if (Number.isFinite(quota) && Number.isFinite(period) && quota > 0 && period > 0) {
      return Math.max(1, Math.floor(quota / period));
    }
  } catch {}

  return null;
};

const getAvailableCpuCount = () => {
  const hostCpuCount = Math.max(1, os.cpus()?.length || 1);
  const cgroupCpuCount = getCgroupCpuCount();
  if (!cgroupCpuCount) return hostCpuCount;
  return Math.max(1, Math.min(hostCpuCount, cgroupCpuCount));
};

const DEFAULT_RENDER_WORKERS = Math.max(1, Math.min(8, getAvailableCpuCount()));

const toBoundedNumber = (value, fallback, { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = {}) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
};

const parsePdfPageCount = (stdout) => {
  if (typeof stdout !== "string") return null;
  const match = stdout.match(/^Pages:\s+(\d+)/m);
  if (!match) return null;
  const pageCount = Number(match[1]);
  return Number.isInteger(pageCount) && pageCount > 0 ? pageCount : null;
};

const parseOutputPageNumber = (filePath) => {
  const match = filePath.match(/-(\d+)\.png$/i);
  if (!match) return 0;
  const pageNum = Number(match[1]);
  return Number.isInteger(pageNum) ? pageNum : 0;
};

const normalizeBinary = (defaultBinary, envKey) => {
  if (process.platform !== "win32") return defaultBinary;
  return process.env[envKey];
};

const getPdfRenderBackend = () =>
  (process.env.PDF_RENDER_BACKEND || DEFAULT_PDF_RENDER_BACKEND).trim().toLowerCase();

const getPdfRendererCandidates = () => {
  const pdftoppm = normalizeBinary("pdftoppm", "PDFTOPPM_PATH");
  const pdftocairo = normalizeBinary("pdftocairo", "PDFTOCAIRO_PATH");
  const backend = getPdfRenderBackend();

  let candidates;

  if (backend === "pdftoppm") {
    candidates = [pdftoppm];
  } else if (backend === "pdftocairo") {
    candidates = [pdftocairo];
  } else {
    candidates = [pdftocairo, pdftoppm];
  }

  return [...new Set(candidates.filter(Boolean))];
};

const buildPdfRenderArgs = ({ dpi, inputPdf, prefix, range }) => {
  const args = ["-png", "-r", String(dpi)];
  if (range) {
    args.push("-f", String(range.start), "-l", String(range.end));
  }
  args.push(inputPdf, prefix);
  return args;
};

const runPdfRenderWithFallback = async ({
  args,
  rendererCandidates,
  jobId,
  jobType,
  stageBase,
}) => {
  let lastError = null;

  for (const renderer of rendererCandidates) {
    const rendererName = path.basename(renderer).toLowerCase();

    try {
      await runCmd(renderer, args, {
        logMeta: {
          jobId: String(jobId),
          jobType,
          stage: `${stageBase}.${rendererName}`,
        },
      });
      return;
    } catch (error) {
      lastError = error;
      console.warn(
        `[Conversion] renderer ${rendererName} failed at stage=${stageBase}. trying next renderer.`
      );
    }
  }

  throw lastError || new Error("PDF_RENDER_FAILED");
};

const getSharp = async () => {
  if (sharpModulePromise !== undefined) return sharpModulePromise;

  sharpModulePromise = import("sharp")
    .then((mod) => mod.default)
    .catch(() => null);

  return sharpModulePromise;
};

export const getConversionRenderWorkers = () =>
  parsePositiveInt(process.env.CONVERSION_RENDER_WORKERS, DEFAULT_RENDER_WORKERS);

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

export const splitPageRanges = (pageCount, workers) => {
  const safePageCount = parsePositiveInt(pageCount, 0);
  if (safePageCount <= 0) return [];

  const safeWorkers = Math.max(1, Math.min(parsePositiveInt(workers, 1), safePageCount));
  const base = Math.floor(safePageCount / safeWorkers);
  const remainder = safePageCount % safeWorkers;

  let cursor = 1;
  const ranges = [];

  for (let i = 0; i < safeWorkers; i += 1) {
    const size = base + (i < remainder ? 1 : 0);
    if (size <= 0) continue;

    const start = cursor;
    const end = cursor + size - 1;
    ranges.push({ start, end });

    cursor = end + 1;
  }

  return ranges;
};

export async function renderPdfToPngPages({
  inputPdf,
  outDir,
  prefix,
  dpi = DEFAULT_DPI,
  jobId,
  jobType,
  stageBase = "pdf_render",
}) {
  const rendererCandidates = getPdfRendererCandidates();
  if (rendererCandidates.length === 0) {
    throw new Error("PDF_RENDERER_NOT_CONFIGURED");
  }

  const PDFINFO = process.platform === "win32" ? process.env.PDFINFO_PATH : "pdfinfo";

  let pageCount = null;

  try {
    const pdfInfo = await runCmd(PDFINFO, [inputPdf], {
      logMeta: {
        jobId: String(jobId),
        jobType,
        stage: `${stageBase}.pdfinfo`,
      },
    });
    pageCount = parsePdfPageCount(pdfInfo.stdout);
  } catch (error) {
    console.warn(`[Conversion] pdfinfo failed. falling back to single render: ${error.message}`);
  }

  const renderWorkers = getConversionRenderWorkers();
  const ranges = splitPageRanges(pageCount ?? 0, renderWorkers);

  if (ranges.length === 0) {
    await runPdfRenderWithFallback({
      args: buildPdfRenderArgs({ dpi, inputPdf, prefix }),
      rendererCandidates,
      jobId,
      jobType,
      stageBase: `${stageBase}.single_pass`,
    });
  } else if (ranges.length === 1) {
    const only = ranges[0];
    await runPdfRenderWithFallback({
      args: buildPdfRenderArgs({ dpi, inputPdf, prefix, range: only }),
      rendererCandidates,
      jobId,
      jobType,
      stageBase: `${stageBase}.pages.${only.start}-${only.end}`,
    });
  } else {
    const limit = pLimit(ranges.length);
    await Promise.all(
      ranges.map((range) =>
        limit(async () => {
          await runPdfRenderWithFallback({
            args: buildPdfRenderArgs({ dpi, inputPdf, prefix, range }),
            rendererCandidates,
            jobId,
            jobType,
            stageBase: `${stageBase}.pages.${range.start}-${range.end}`,
          });
        })
      )
    );
  }

  const files = (await listFiles(outDir))
    .filter((filePath) => filePath.toLowerCase().endsWith(".png"))
    .sort((a, b) => parseOutputPageNumber(a) - parseOutputPageNumber(b));

  return files;
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
  if (!sharp) return defaultSelection;

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
