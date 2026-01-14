import { createUploadUrl } from "../services/gcs.service.js";

export async function postUploadUrl(req, res, next) {
  try {
    const result = await createUploadUrl(req.body);
    return success(res, result);
  } catch (e) {
    next(e);
  }
}

export async function postComplete(req, res, next) {
  try {
    const result = await completeFileUpload(req.body);
    return success(res, result);
  } catch (e) {
    next(e);
  }
}
