import { jest } from "@jest/globals";

const mockProcessBulkEditProjectScripts = jest.fn();
const mockProcessGetProjectScripts = jest.fn();
const mockProcessScriptGet = jest.fn();
const mockProcessScriptRestore = jest.fn();
const mockProcessScriptUpdate = jest.fn();
const mockProcessScriptVersionGet = jest.fn();

jest.unstable_mockModule("../../src/services/script.service.js", () => ({
  processBulkEditProjectScripts: mockProcessBulkEditProjectScripts,
  processGetProjectScripts: mockProcessGetProjectScripts,
  processScriptGet: mockProcessScriptGet,
  processScriptRestore: mockProcessScriptRestore,
  processScriptUpdate: mockProcessScriptUpdate,
  processScriptVersionGet: mockProcessScriptVersionGet,
}));

const {
  handleBulkEditProjectScripts,
  handleGetProjectScripts,
  handleGetScript,
  handleGetScriptVersion,
  handleRestoreVersion,
  handleUploadScript,
} = await import("../../src/controllers/script.controller.js");

const { scriptResponseDTO, scriptVersionResponseDTO } =
  await import("../../src/dtos/script.dto.js");

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("script.controller", () => {
  beforeEach(() => {
    mockProcessBulkEditProjectScripts.mockReset();
    mockProcessGetProjectScripts.mockReset();
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
    const versions = [{ versionNumber: 1, scriptText: "v1", charCount: 2, createdAt: new Date() }];
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

  test("handleGetProjectScripts returns all scripts", async () => {
    const projectScripts = {
      projectId: "12",
      scripts: [
        { slideId: "11", scriptText: "첫번째" },
        { slideId: "12", scriptText: "" },
      ],
    };

    mockProcessGetProjectScripts.mockResolvedValue(projectScripts);

    const req = {
      params: { projectId: "12" },
      user: { id: 99n },
    };
    const res = createRes();
    const next = jest.fn();

    await handleGetProjectScripts(req, res, next);

    expect(mockProcessGetProjectScripts).toHaveBeenCalledWith({
      projectId: "12",
      userId: 99n,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      resultType: "SUCCESS",
      error: null,
      success: {
        message: "프로젝트 대본이 성공적으로 조회되었습니다.",
        ...projectScripts,
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("handleBulkEditProjectScripts returns edit summary", async () => {
    const summary = {
      projectId: "12",
      requestedSlideCount: 2,
      updatedSlideCount: 1,
      unchangedSlideCount: 1,
      updatedSlideIds: ["11"],
    };

    mockProcessBulkEditProjectScripts.mockResolvedValue(summary);

    const req = {
      params: { projectId: "12" },
      user: { id: 99n },
      body: {
        scripts: [
          { slideId: "11", scriptText: "수정" },
          { slideId: "12", scriptText: "" },
        ],
      },
    };
    const res = createRes();
    const next = jest.fn();

    await handleBulkEditProjectScripts(req, res, next);

    expect(mockProcessBulkEditProjectScripts).toHaveBeenCalledWith({
      projectId: "12",
      userId: 99n,
      scripts: [
        { slideId: "11", scriptText: "수정" },
        { slideId: "12", scriptText: "" },
      ],
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      resultType: "SUCCESS",
      error: null,
      success: {
        message: "대본 일괄 수정이 완료되었습니다.",
        ...summary,
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("handleBulkEditProjectScripts forwards service error", async () => {
    const error = new Error("bulk edit failed");
    mockProcessBulkEditProjectScripts.mockRejectedValue(error);

    const req = {
      params: { projectId: "12" },
      user: { id: 99n },
      body: { scripts: [] },
    };
    const res = createRes();
    const next = jest.fn();

    await handleBulkEditProjectScripts(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
