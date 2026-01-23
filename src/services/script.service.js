import {
  getScriptText,
  getScriptVersionList,
  postScriptVersion,
  updateScriptText,
} from "../repositories/script.repository.js";

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
