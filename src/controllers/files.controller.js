import { createUploadUrl, verifyUploadedObject } from "../services/gcs.service.js";

export async function postUploadUrl(req, res) {
  try {
    const result = await createUploadUrl(req.body);
    res.status(200).json({ resultType: "SUCCESS", error: null, result });
  } catch (e) {
    res.status(e.status || 500).json({
      resultType: "FAIL",
      error: { errorCode: e.message || "UNKNOWN", reason: e.message || "error" },
      result: null,
    });
  }
}

export async function postComplete(req, res) {
  try {
    const { objectKey } = req.body;
    if (!objectKey) {
      return res.status(400).json({
        resultType: "FAIL",
        error: { errorCode: "MISSING_OBJECT_KEY", reason: "objectKey required" },
        result: null,
      });
    }

    const meta = await verifyUploadedObject({ objectKey });

    // 여기서 (원하면) contentType/size 재검증 + DB 업데이트 추가
    res.status(200).json({ resultType: "SUCCESS", error: null, result: { ok: true, ...meta } });
  } catch (e) {
    res.status(e.status || 500).json({
      resultType: "FAIL",
      error: { errorCode: e.message || "UNKNOWN", reason: e.message || "error" },
      result: null,
    });
  }
}
