import { jest } from "@jest/globals";

const mockProcessCreateProject = jest.fn();
const mockProcessUpdateProjectName = jest.fn();
const mockIssueAnonymousSession = jest.fn();
const mockMergeAnonymousData = jest.fn();

jest.unstable_mockModule("../../src/services/project.service.js", () => ({
  processCreateProject: mockProcessCreateProject,
  processUpdateProjectName: mockProcessUpdateProjectName,
}));

jest.unstable_mockModule("../../src/services/session.service.js", () => ({
  issueAnonymousSession: mockIssueAnonymousSession,
  mergeAnonymousData: mockMergeAnonymousData,
}));

const {
  handleCreateAnonymousProject,
  handleCreateAnonymousSession,
  handleMergeSession,
  handleUpdateAnonymousProject,
} = await import("../../src/controllers/session.controller.js");

const { projectResponseDTO } = await import("../../src/dtos/project.dto.js");
const {
  anonymousSessionResponseDTO,
  mergeResultResponseDTO,
} = await import("../../src/dtos/session.dto.js");

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("session.controller", () => {
  beforeEach(() => {
    mockProcessCreateProject.mockReset();
    mockProcessUpdateProjectName.mockReset();
    mockIssueAnonymousSession.mockReset();
    mockMergeAnonymousData.mockReset();
  });

  test("handleCreateAnonymousSession returns dto", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-02-12T00:00:00.000Z"));
    mockIssueAnonymousSession.mockResolvedValue({
      sessionId: "session-1",
      tokens: { accessToken: "access", refreshToken: "refresh" },
    });

    const req = {};
    const res = createRes();
    const next = jest.fn();

    await handleCreateAnonymousSession(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      resultType: "SUCCESS",
      error: null,
      success: anonymousSessionResponseDTO("session-1", {
        accessToken: "access",
        refreshToken: "refresh",
      }),
    });
    jest.useRealTimers();
  });

  test("handleCreateAnonymousProject returns dto", async () => {
    const project = { id: 1n, title: "익명", updatedAt: new Date() };
    mockProcessCreateProject.mockResolvedValue(project);

    const req = { user: { id: 7n }, body: { title: "익명", uploadedFileId: "1" } };
    const res = createRes();
    const next = jest.fn();

    await handleCreateAnonymousProject(req, res, next);

    expect(mockProcessCreateProject).toHaveBeenCalledWith(7n, req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      resultType: "SUCCESS",
      error: null,
      success: projectResponseDTO(project),
    });
  });

  test("handleUpdateAnonymousProject forwards errors", async () => {
    const error = new Error("update failed");
    mockProcessUpdateProjectName.mockRejectedValue(error);

    const req = {
      params: { projectId: "1" },
      body: { title: "수정" },
      user: { id: 7n },
    };
    const res = createRes();
    const next = jest.fn();

    await handleUpdateAnonymousProject(req, res, next);

    expect(mockProcessUpdateProjectName).toHaveBeenCalledWith("1", 7n, "수정");
    expect(next).toHaveBeenCalledWith(error);
  });

  test("handleMergeSession returns dto", async () => {
    mockMergeAnonymousData.mockResolvedValue(3);

    const req = { body: { anonymousSessionId: "session-1" }, user: { id: 2n } };
    const res = createRes();
    const next = jest.fn();

    await handleMergeSession(req, res, next);

    expect(mockMergeAnonymousData).toHaveBeenCalledWith("session-1", 2n);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      resultType: "SUCCESS",
      error: null,
      success: mergeResultResponseDTO(3),
    });
  });
});
