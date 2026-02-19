import fs from "fs/promises";
import path from "path";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import pLimit from "p-limit";
import { prisma } from "../../db.config.js";
import { updateScriptText } from "../../repositories/script.repository.js";
import { parsePositiveInt } from "../../utils/conversion.util.js";

const NOTES_RELATIONSHIP_SUFFIX = "/relationships/notesSlide";
const CHARS_PER_MINUTE = 300;
const DEFAULT_NOTES_UPDATE_CONCURRENCY = 8;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: false,
  trimValues: false,
});

const toArray = (value) => {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
};

const isObject = (value) => typeof value === "object" && value !== null;

const parseSlideNumber = (slidePath) => {
  const match = slidePath.match(/^ppt\/slides\/slide(\d+)\.xml$/);
  return match ? Number(match[1]) : null;
};

const parseXml = (xml) => xmlParser.parse(xml);

const findFirstObjectByKeySuffix = (obj, suffix) => {
  if (!isObject(obj)) return null;

  for (const [key, value] of Object.entries(obj)) {
    if (key === suffix || key.endsWith(`:${suffix}`)) {
      return value;
    }
  }

  return null;
};

const findNotesTarget = (relsObj) => {
  const relationshipsRoot = findFirstObjectByKeySuffix(relsObj, "Relationships");
  const relationshipsValue = findFirstObjectByKeySuffix(relationshipsRoot, "Relationship");
  const relationships = toArray(relationshipsValue);
  const notesRel = relationships.find(
    (rel) => typeof rel?.Type === "string" && rel.Type.endsWith(NOTES_RELATIONSHIP_SUFFIX)
  );
  return typeof notesRel?.Target === "string" ? notesRel.Target : null;
};

const isSlideNumberType = (typeValue) => {
  if (typeof typeValue !== "string") return false;
  const normalized = typeValue.toLowerCase();
  return normalized === "sldnum" || normalized === "slidenum" || normalized === "slidenumber";
};

const isSlideNumberPlaceholderShape = (shapeObj) => {
  const nvSpPr = findFirstObjectByKeySuffix(shapeObj, "nvSpPr");
  const nvPr = findFirstObjectByKeySuffix(nvSpPr, "nvPr");
  const ph = findFirstObjectByKeySuffix(nvPr, "ph");
  return isSlideNumberType(ph?.type);
};

const resolveNotesPath = (slideRelsPath, target) => {
  const cleanTarget = String(target || "").split("#")[0];
  if (!cleanTarget) return null;

  if (cleanTarget.startsWith("/")) {
    return path.posix.normalize(cleanTarget.slice(1));
  }

  const slideDir = path.posix.dirname(slideRelsPath).replace(/\/_rels$/, "");
  return path.posix.normalize(path.posix.join(slideDir, cleanTarget));
};

const readTextNode = (value) => {
  if (typeof value === "string") return value;
  if (!isObject(value)) return "";
  if (typeof value["#text"] === "string") return value["#text"];
  if (typeof value._ === "string") return value._;
  return "";
};

const collectTextRuns = (node, out = []) => {
  if (node == null) return out;

  if (Array.isArray(node)) {
    for (const item of node) collectTextRuns(item, out);
    return out;
  }

  if (!isObject(node)) return out;

  if (isSlideNumberType(node.type)) {
    return out;
  }

  if (isSlideNumberPlaceholderShape(node)) {
    return out;
  }

  for (const [key, value] of Object.entries(node)) {
    if (key === "a:t" || key.endsWith(":t")) {
      for (const t of toArray(value)) {
        const text = readTextNode(t);
        if (text) out.push(text);
      }
      continue;
    }

    collectTextRuns(value, out);
  }

  return out;
};

const collectParagraphNodes = (node, out = []) => {
  if (node == null) return out;

  if (Array.isArray(node)) {
    for (const item of node) collectParagraphNodes(item, out);
    return out;
  }

  if (!isObject(node)) return out;

  for (const [key, value] of Object.entries(node)) {
    if (key === "a:p" || key.endsWith(":p")) {
      out.push(...toArray(value));
    }
    collectParagraphNodes(value, out);
  }

  return out;
};

const normalizeNoteText = (text) => {
  if (typeof text !== "string") return "";

  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .trim();
};

const extractTextFromNotesXml = (notesObj) => {
  const paragraphs = collectParagraphNodes(notesObj);

  if (paragraphs.length === 0) {
    return normalizeNoteText(collectTextRuns(notesObj).join(""));
  }

  const paragraphTexts = paragraphs.map((p) => collectTextRuns(p).join(""));
  return normalizeNoteText(paragraphTexts.join("\n"));
};

const estimateDurationSeconds = (charCount) => {
  if (!Number.isInteger(charCount) || charCount <= 0) return 0;
  return Math.ceil((charCount / CHARS_PER_MINUTE) * 60);
};

const getNotesUpdateConcurrency = () =>
  parsePositiveInt(process.env.CONVERSION_UPLOAD_CONCURRENCY, DEFAULT_NOTES_UPDATE_CONCURRENCY);

export async function extractSlideNotesFromPptxPath(pptxPath) {
  const buffer = await fs.readFile(pptxPath);
  const zip = await JSZip.loadAsync(buffer);

  const slidePaths = Object.keys(zip.files)
    .filter((filePath) => /^ppt\/slides\/slide\d+\.xml$/.test(filePath))
    .sort((a, b) => parseSlideNumber(a) - parseSlideNumber(b));

  const notesMap = new Map();

  for (const slidePath of slidePaths) {
    const slideNum = parseSlideNumber(slidePath);
    if (!Number.isInteger(slideNum)) continue;

    const relsPath = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
    const relsFile = zip.file(relsPath);
    if (!relsFile) continue;

    const relsXml = await relsFile.async("text");
    const relsObj = parseXml(relsXml);
    const notesTarget = findNotesTarget(relsObj);
    if (!notesTarget) continue;

    const notesPath = resolveNotesPath(relsPath, notesTarget);
    if (!notesPath) continue;

    const notesFile = zip.file(notesPath);
    if (!notesFile) continue;

    const notesXml = await notesFile.async("text");
    const notesObj = parseXml(notesXml);
    const noteText = extractTextFromNotesXml(notesObj);

    if (noteText) {
      notesMap.set(slideNum, noteText);
    }
  }

  return notesMap;
}

export async function applyNotesToProjectSlides({ projectId, notesMap }) {
  const map = notesMap instanceof Map ? notesMap : new Map();

  if (map.size === 0) {
    return {
      appliedCount: 0,
      skippedExistingCount: 0,
      unmatchedCount: 0,
    };
  }

  const slides = await prisma.slide.findMany({
    where: {
      projectId: BigInt(projectId),
      isDeleted: false,
    },
    select: {
      id: true,
      slideNum: true,
      script: {
        select: {
          scriptText: true,
        },
      },
    },
  });

  const slideByNum = new Map();
  for (const slide of slides) {
    if (slide.slideNum != null) {
      slideByNum.set(Number(slide.slideNum), slide);
    }
  }

  let skippedExistingCount = 0;
  let unmatchedCount = 0;
  const updates = [];

  for (const [rawSlideNum, rawText] of map.entries()) {
    const slideNum = Number(rawSlideNum);
    const slide = slideByNum.get(slideNum);

    if (!slide) {
      unmatchedCount += 1;
      continue;
    }

    const existingText = (slide.script?.scriptText || "").trim();
    if (existingText) {
      skippedExistingCount += 1;
      continue;
    }

    const scriptText = normalizeNoteText(String(rawText ?? ""));
    if (!scriptText) {
      continue;
    }

    const charCount = scriptText.length;
    const duration = estimateDurationSeconds(charCount);
    updates.push({ slideId: slide.id, scriptText, charCount, duration });
  }

  const limit = pLimit(getNotesUpdateConcurrency());
  await Promise.all(
    updates.map((update) =>
      limit(() =>
        updateScriptText(update.slideId, update.scriptText, update.charCount, update.duration)
      )
    )
  );

  return {
    appliedCount: updates.length,
    skippedExistingCount,
    unmatchedCount,
  };
}
