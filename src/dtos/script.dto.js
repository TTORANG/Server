export const scriptResponseDTO = (script) => {
  return {
    message: "대본 작업이 완료되었습니다.",
    slideId: script.slideId.toString(),
    charCount: script.charCount,
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
