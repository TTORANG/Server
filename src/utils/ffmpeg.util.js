const resolveBinary = (binaryName, envKey) => {
  if (process.platform === "win32") {
    const binPath = process.env[envKey];
    if (!binPath) {
      throw new Error(`${envKey} is not set on win32 environment`);
    }
    return binPath;
  }
  return binaryName;
};

export const FFMPEG_PATH = resolveBinary("ffmpeg", "FFMPEG_PATH");
export const FFPROBE_PATH = resolveBinary("ffprobe", "FFPROBE_PATH");
