import {
  getProjectSlidesWithScripts,
  getScriptText,
  getScriptVersionList,
  postScriptVersion,
  updateScriptText,
} from "../repositories/script.repository.js";
import { ProjectNotFoundError } from "../errors/project.error.js";
import {
  ScriptBulkEditDuplicateSlideError,
  ScriptBulkEditPayloadError,
  ScriptBulkEditSlideNotFoundError,
} from "../errors/script.error.js";

export const processScriptUpdate = async (slideId, text) => {
  try {
    const current = await getScriptText(slideId);

    if (current && (current.scriptText || "").trim() === (text || "").trim()) {
      return { result: current, isUpdated: false };
    }

    const charCount = scriptCharCount(text);
    const duration = estimateDurationCount(charCount);
    const updatedScript = await updateScriptText(slideId, text, charCount, duration);

    return { result: updatedScript, isUpdated: true };
  } catch (error) {
    throw error;
  }
};

const scriptCharCount = (text) => {
  return text ? text.length : 0;
};

const estimateDurationCount = (charCount) => {
  let duration;
  const CHARS_PER_MINUTE = 300;
  if (charCount < 1) {
    duration = 0;
  } else {
    duration = Math.ceil((charCount / CHARS_PER_MINUTE) * 60);
  }
  return duration;
};

export const processScriptGet = async (slideId) => {
  try {
    const script = await getScriptText(slideId);

    if (!script) {
      return {
        slideId,
        charCount: 0,
        scriptText: "",
        estimatedDurationSeconds: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return script;
  } catch (error) {
    throw error;
  }
};

export const processScriptVersionGet = async (slideId) => {
  try {
    const result = await getScriptVersionList(slideId);

    return result;
  } catch (error) {
    throw error;
  }
};

export const processScriptRestore = async (id, versionNumber) => {
  try {
    const result = await postScriptVersion(id, versionNumber);
    return result;
  } catch (error) {
    throw error;
  }
};

const normalizeBulkEditScripts = (scripts) => {
  if (!Array.isArray(scripts) || scripts.length < 1) {
    throw new ScriptBulkEditPayloadError({ scripts });
  }

  const normalized = [];
  const usedSlideIds = new Set();

  for (let i = 0; i < scripts.length; i++) {
    const item = scripts[i];
    if (!item || typeof item !== "object") {
      throw new ScriptBulkEditPayloadError({ index: i, item });
    }

    const slideId = item.slideId != null ? String(item.slideId) : "";
    if (!slideId || !/^\d+$/.test(slideId)) {
      throw new ScriptBulkEditPayloadError({ index: i, slideId: item.slideId });
    }

    if (usedSlideIds.has(slideId)) {
      throw new ScriptBulkEditDuplicateSlideError({ slideId });
    }

    if (typeof item.scriptText !== "string") {
      throw new ScriptBulkEditPayloadError({ index: i, slideId, scriptText: item.scriptText });
    }

    usedSlideIds.add(slideId);
    normalized.push({ slideId, scriptText: item.scriptText });
  }

  return normalized;
};

export const processGetProjectScripts = async ({ projectId, userId }) => {
  const project = await getProjectSlidesWithScripts(projectId, userId);
  if (!project) {
    throw new ProjectNotFoundError({ projectId });
  }

  return {
    projectId: project.id.toString(),
    scripts: (project.slides || []).map((slide) => ({
      slideId: slide.id.toString(),
      title: slide.title,
      scriptText: slide.script?.scriptText || "",
    })),
  };
};

export const processBulkEditProjectScripts = async ({ projectId, userId, scripts }) => {
  const normalizedScripts = normalizeBulkEditScripts(scripts);

  const project = await getProjectSlidesWithScripts(projectId, userId);
  if (!project) {
    throw new ProjectNotFoundError({ projectId });
  }

  const projectSlideIds = new Set((project.slides || []).map((slide) => slide.id.toString()));
  const invalidSlideIds = normalizedScripts
    .filter((item) => !projectSlideIds.has(item.slideId))
    .map((item) => item.slideId);

  if (invalidSlideIds.length > 0) {
    throw new ScriptBulkEditSlideNotFoundError({
      projectId,
      slideIds: invalidSlideIds,
    });
  }

  let updatedSlideCount = 0;
  let unchangedSlideCount = 0;
  const updatedSlideIds = [];

  const updateResults = await Promise.all(
    normalizedScripts.map((item) => processScriptUpdate(item.slideId, item.scriptText)),
  );

  for (let i = 0; i < updateResults.length; i++) {
    const { isUpdated } = updateResults[i];
    if (isUpdated) {
      updatedSlideCount += 1;
      updatedSlideIds.push(normalizedScripts[i].slideId);
      continue;
    }

    unchangedSlideCount += 1;
  }

  return {
    projectId: project.id.toString(),
    requestedSlideCount: normalizedScripts.length,
    updatedSlideCount,
    unchangedSlideCount,
    updatedSlideIds,
  };
};
