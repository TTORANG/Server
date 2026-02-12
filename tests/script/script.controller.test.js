import { jest } from "@jest/globals";

const mockProcessScriptGet = jest.fn();
const mockProcessScriptRestore = jest.fn();
const mockProcessScriptUpdate = jest.fn();
const mockProcessScriptVersionGet = jest.fn();

jest.unstable_mockModule("../../src/services/script.service.js", () => ({
  processScriptGet: mockProcessScriptGet,
  processScriptRestore: mockProcessScriptRestore,
  processScriptUpdate: mockProcessScriptUpdate,
  processScriptVersionGet: mockProcessScriptVersionGet,
}));

const {
  handleGetScript,
  handleGetScriptVersion,
  handleRestoreVersion,
  handleUploadScript,
} = await import("../../src/controllers/script.controller.js");

const { scriptResponseDTO, scriptVersionResponseDTO } = await import(
  "../../src/dtos/script.dto.js"
);

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("script.controller", () => {
  beforeEach(() => {
    mockProcessScriptGet.mockReset();
    mockProcessScriptRestore.mockReset();
    mockProcessScriptUpdate.mockReset();
    mockProcessScriptVersionGet.mockReset();
  });

  test("handleUploadScript returns not-updated message", async () => {
    const script = {
      slideId: 1n,
      charCount: 0,
      scriptText: "",
      estimatedDurationSeconds: 0,
      createdAt: new Date("2026-02-12T00:00:00.000Z"),
      updatedAt: new Date("2026-02-12T00:00:00.000Z"),
    };
    mockProcessScriptUpdate.mockResolvedValue({ result: script, isUpdated: false });

    const req = { params: { slideId: "1" }, body: { script: "" } };
    const res = createRes();
    const next = jest.fn();

    await handleUploadScript(req, res, next);

    expect(mockProcessScriptUpdate).toHaveBeenCalledWith("1", "");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      resultType: "SUCCESS",
      error: null,
      success: {
        message: "변경사항이 없어 저장되지 않았습니다.",
        ...scriptResponseDTO(script),
      },
    });
  });

  test("handleGetScript returns dto", async () => {
    const script = {
      slideId: 2n,
      charCount: 5,
      scriptText: "hello",
      estimatedDurationSeconds: 1,
      createdAt: new Date("2026-02-12T00:00:00.000Z"),
      updatedAt: new Date("2026-02-12T00:01:00.000Z"),
    };
    mockProcessScriptGet.mockResolvedValue(script);

    const req = { params: { slideId: "2" } };
    const res = createRes();
    const next = jest.fn();

    await handleGetScript(req, res, next);

    expect(mockProcessScriptGet).toHaveBeenCalledWith("2");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      resultType: "SUCCESS",
      error: null,
      success: {
        message: "대본이 성공적으로 조회되었습니다.",
        ...scriptResponseDTO(script),
      },
    });
  });

  test("handleGetScriptVersion returns dto list", async () => {
    const versions = [
      { versionNumber: 1, scriptText: "v1", charCount: 2, createdAt: new Date() },
    ];
    mockProcessScriptVersionGet.mockResolvedValue(versions);

    const req = { params: { slideId: "3" } };
    const res = createRes();
    const next = jest.fn();

    await handleGetScriptVersion(req, res, next);

    expect(mockProcessScriptVersionGet).toHaveBeenCalledWith("3");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      resultType: "SUCCESS",
      error: null,
      success: scriptVersionResponseDTO(versions),
    });
  });

  test("handleRestoreVersion returns dto", async () => {
    const script = {
      slideId: 4n,
      charCount: 3,
      scriptText: "복원",
      estimatedDurationSeconds: 1,
      createdAt: new Date("2026-02-12T00:00:00.000Z"),
      updatedAt: new Date("2026-02-12T00:01:00.000Z"),
    };
    mockProcessScriptRestore.mockResolvedValue(script);

    const req = { params: { slideId: "4" }, body: { version: 1 } };
    const res = createRes();
    const next = jest.fn();

    await handleRestoreVersion(req, res, next);

    expect(mockProcessScriptRestore).toHaveBeenCalledWith("4", 1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      resultType: "SUCCESS",
      error: null,
      success: {
        message: "대본이 성공적으로 복원되었습니다.",
        ...scriptResponseDTO(script),
      },
    });
  });
});
