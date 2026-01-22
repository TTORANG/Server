import { updateScriptText } from "../repositories/script.repository.js";

export const processScriptUpdate = async (slideId, text) => {
  try {
    const charCount = scriptCharCount(text);

    const duration = estimateDurationCount(charCount);

    const updatedScript = await updateScriptText(slideId, text, charCount, duration);

    return updatedScript;
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
