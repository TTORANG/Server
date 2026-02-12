import { jest } from "@jest/globals";

const mockProcessCreateProject = jest.fn();
const mockProcessDeleteProject = jest.fn();
const mockProcessGetProjectList = jest.fn();
const mockProcessGetProjectName = jest.fn();
const mockProcessUpdateProjectName = jest.fn();

jest.unstable_mockModule("../../src/services/project.service.js", () => ({
  processCreateProject: mockProcessCreateProject,
  processDeleteProject: mockProcessDeleteProject,
  processGetProjectList: mockProcessGetProjectList,
  processGetProjectName: mockProcessGetProjectName,
  processUpdateProjectName: mockProcessUpdateProjectName,
}));

const {
  handleCreateProject,
  handleDeleteProject,
  handleGetProjectList,
  handleGetProjectName,
  handleUpdateProjectName,
} = await import("../../src/controllers/project.controller.js");

const {
  createProjectResponseDTO,
  projectListResponseDTO,
  projectNameResponseDTO,
  projectResponseDTO,
} = await import("../../src/dtos/project.dto.js");

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("project.controller", () => {
  beforeEach(() => {
    mockProcessCreateProject.mockReset();
    mockProcessDeleteProject.mockReset();
    mockProcessGetProjectList.mockReset();
    mockProcessGetProjectName.mockReset();
    mockProcessUpdateProjectName.mockReset();
  });

  test("handleCreateProject returns dto with 201", async () => {
    const createdAt = new Date("2026-02-12T00:00:00.000Z");
    const project = { id: 1n, title: "테스트", createdAt };
    mockProcessCreateProject.mockResolvedValue(project);

    const req = { user: { id: 5n }, body: { title: "테스트", uploadedFileId: "1" } };
    const res = createRes();
    const next = jest.fn();

    await handleCreateProject(req, res, next);

    expect(mockProcessCreateProject).toHaveBeenCalledWith(5n, req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      resultType: "SUCCESS",
      error: null,
      success: createProjectResponseDTO(project),
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("handleUpdateProjectName returns dto with 200", async () => {
    const updatedAt = new Date("2026-02-12T00:10:00.000Z");
    const project = { id: 2n, title: "수정", updatedAt };
    mockProcessUpdateProjectName.mockResolvedValue(project);

    const req = {
      params: { projectId: "2" },
      body: { title: "수정" },
      user: { id: 5n },
    };
    const res = createRes();
    const next = jest.fn();

    await handleUpdateProjectName(req, res, next);

    expect(mockProcessUpdateProjectName).toHaveBeenCalledWith("2", 5n, "수정");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      resultType: "SUCCESS",
      error: null,
      success: projectResponseDTO(project),
    });
  });

  test("handleDeleteProject forwards service errors", async () => {
    const error = new Error("delete failed");
    mockProcessDeleteProject.mockRejectedValue(error);

    const req = { params: { projectId: "2" }, user: { id: 5n } };
    const res = createRes();
    const next = jest.fn();

    await handleDeleteProject(req, res, next);

    expect(mockProcessDeleteProject).toHaveBeenCalledWith("2", 5n);
    expect(next).toHaveBeenCalledWith(error);
  });

  test("handleGetProjectList returns dto", async () => {
    const projects = [
      {
        id: 1n,
        title: "조회",
        createdAt: new Date("2026-02-12T00:00:00.000Z"),
        updatedAt: new Date("2026-02-12T00:01:00.000Z"),
        conversionJobs: [],
        uploadedFiles: [],
        shareLinks: [],
        slides: [],
        _count: { reactions: 0, comments: 0 },
      },
    ];
    mockProcessGetProjectList.mockResolvedValue({
      projects,
      total: 1,
      page: 1,
      limit: 20,
    });

    const req = { user: { id: 5n }, query: { page: "1", limit: "20" } };
    const res = createRes();
    const next = jest.fn();

    await handleGetProjectList(req, res, next);

    expect(mockProcessGetProjectList).toHaveBeenCalledWith(5n, req.query);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      resultType: "SUCCESS",
      error: null,
      success: projectListResponseDTO(projects, 1, 1, 20),
    });
  });

  test("handleGetProjectName returns dto", async () => {
    const createdAt = new Date("2026-02-12T00:00:00.000Z");
    const project = { id: 4n, title: "이름 조회", createdAt };
    mockProcessGetProjectName.mockResolvedValue(project);

    const req = { params: { projectId: "4" } };
    const res = createRes();
    const next = jest.fn();

    await handleGetProjectName(req, res, next);

    expect(mockProcessGetProjectName).toHaveBeenCalledWith("4");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      resultType: "SUCCESS",
      error: null,
      success: projectNameResponseDTO(project),
    });
  });
});
