import fs from "fs/promises";
import { runCmd, tmpPath, uploadToGCS, envPrefix, uuid } from "./conversion.util.js";

const FFMPEG =
  process.platform === "win32"
    ? (() => {
        if (!process.env.FFMPEG_PATH) {
          throw new Error("FFMPEG_PATH is not set on win32 environment");
        }
        return process.env.FFMPEG_PATH;
      })()
    : "ffmpeg";

export async function extractVideoThumbnail({ inputPath, videoId, atSeconds = 3 }) {
  const tmpOut = tmpPath(`video-thumb-${videoId}.png`);

  await runCmd(FFMPEG, [
    "-i",
    inputPath,
    "-ss",
    String(atSeconds),
    "-vframes",
    "1",
    "-vf",
    "scale=512:288:force_original_aspect_ratio=decrease",
    "-f",
    "image2",
    tmpOut,
  ]);

  const env = envPrefix();
  const objectKey = `${env}/video/${videoId}/thumbnail/${uuid()}.png`;

  const uploaded = await uploadToGCS({
    srcPath: tmpOut,
    objectKey,
    contentType: "image/png",
  });

  await fs.rm(tmpOut, { force: true }).catch(() => {});

  return uploaded.url;
}
