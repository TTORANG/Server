import { runCmd } from "./conversion.util.js";

const FFPROBE =
  process.platform === "win32"
    ? (() => {
        if (!process.env.FFPROBE_PATH) {
          throw new Error("FFPROBE_PATH is not set on win32 environment");
        }
        return process.env.FFPROBE_PATH;
      })()
    : "ffprobe";

export async function probeVideoMeta(inputPath) {
  const result = await runCmd(FFPROBE, [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height,avg_frame_rate,codec_name",
    "-show_entries",
    "format=duration",
    "-of",
    "json",
    inputPath,
  ]);

  if (!result.stdout) {
    throw new Error("FFPROBE_RETURNED_EMPTY_STDOUT");
  }

  const json = JSON.parse(result.stdout);

  const stream = json.streams?.[0];
  const format = json.format;

  const [num, den] = (stream?.avg_frame_rate ?? "0/1").split("/").map(Number);

  return {
    durationSeconds: format?.duration ? Math.floor(Number(format.duration)) : null,
    width: stream?.width ?? null,
    height: stream?.height ?? null,
    fps: den ? Number((num / den).toFixed(2)) : null,
    codec: stream?.codec_name ?? null,
  };
}
