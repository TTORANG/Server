/**
 * 청크를 바이트 단위로 순서대로 재조립한 뒤 ffmpeg로 재인코딩
 * - 프론트에서 완성 Blob을 raw split해 업로드한 경우를 처리
 */
const mergeChunks = async (chunksDir, outputPath, chunks, ext) => {
  const orderedChunks = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
  const firstIndex = orderedChunks[0]?.chunkIndex;
  if (firstIndex !== 0) {
    throw new InvalidParameterError({ firstIndex }, "청크 인덱스는 0부터 연속이어야 합니다.");
  }

  for (let i = 1; i < orderedChunks.length; i += 1) {
    const expected = orderedChunks[i - 1].chunkIndex + 1;
    if (orderedChunks[i].chunkIndex !== expected) {
      throw new InvalidParameterError(
        {
          prevChunkIndex: orderedChunks[i - 1].chunkIndex,
          currentChunkIndex: orderedChunks[i].chunkIndex,
        },
        "청크 인덱스가 연속되지 않아 원본 영상을 재조립할 수 없습니다."
      );
    }
  }

  const assembledInputPath = path.join(chunksDir, `assembled.${ext}`);
  await fs.writeFile(assembledInputPath, Buffer.alloc(0));

  for (const c of orderedChunks) {
    const chunkPath = path.join(chunksDir, `chunk_${String(c.chunkIndex).padStart(5, "0")}.${ext}`);
    const chunkBytes = await fs.readFile(chunkPath);
    await fs.appendFile(assembledInputPath, chunkBytes);
  }

  await runCmd(
    FFMPEG,
    [
      "-fflags",
      "+genpts",
      "-i",
      assembledInputPath,
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac", // 오디오 재인코딩
      "-b:a",
      "128k",
      "-movflags",
      "faststart",
      "-y",
      outputPath,
    ],
    { cwd: chunksDir }
  );
};
