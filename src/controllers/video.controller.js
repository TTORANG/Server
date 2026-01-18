import * as videoService from "../services/video.service.js";

export async function createVideo(req, res, next) {
  try {
    const result = await videoService.createVideo(req.body);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

// Video Chunk 업로드 API
export async function createVideoChunkUploadUrl(req, res, next) {
  try {
    const result = await videoService.createVideoChunkUploadUrl({
      videoId: req.params.videoId,
      ...req.body,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

// chunk complete API
export async function completeVideoChunk(req, res, next) {
  try {
    const result = await videoService.completeVideoChunk({
      videoId: req.params.videoId,
      ...req.body,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

// 업로드 완료 → 인코딩 Job 생성
export async function completeVideoUpload(req, res, next) {
  try {
    const result = await videoService.completeVideoUpload({
      videoId: req.params.videoId,
      projectId: req.body.projectId,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
}
