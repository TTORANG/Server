import fs from "fs/promises";
import { runCmd, tmpPath, uploadToGCS, envPrefix, uuid } from "./conversion.util.js";
import { FFMPEG_PATH } from "./ffmpeg.util.js";
import { THUMBNAIL_HEIGHT, THUMBNAIL_WIDTH } from "../constants/videos.js";

const FFMPEG = FFMPEG_PATH;

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
    `scale=${THUMBNAIL_WIDTH}:${THUMBNAIL_HEIGHT}:force_original_aspect_ratio=decrease`,
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
