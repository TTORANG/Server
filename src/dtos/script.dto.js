export const scriptResponseDTO = (script) => {
  return {
    slideId: script.slideId.toString(),
    charCount: script.charCount,
    scriptText: script.scriptText || "",
    estimatedDurationSeconds: script.estimatedDurationSeconds,
    createdAt: script.createdAt,
    updatedAt: script.updatedAt,
  };
};
export const scriptVersionResponseDTO = (scriptVersion) => {
  return scriptVersion.map((v) => ({
    versionNumber: v.versionNumber,
    scriptText: v.scriptText,
    charCount: v.charCount,
    createdAt: v.createdAt,
  }));
};
