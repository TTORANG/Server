import { scriptResponseDTO } from "../dtos/script.dto.js";
import { processScriptGet, processScriptUpdate } from "../services/script.service.js";

export const handleUploadScript = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { script } = req.body;

    const result = await processScriptUpdate(id, script);

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: scriptResponseDTO(result),
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetScript = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await processScriptGet(id);
    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: scriptResponseDTO(result),
    });
  } catch (error) {
    next(error);
  }
};
