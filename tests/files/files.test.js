import { jest } from "@jest/globals";

const mockUploadPresentationAndCreateProject = jest.fn();

jest.unstable_mockModule("../../src/services/files.service.js", () => ({
  uploadPresentationAndCreateProject: mockUploadPresentationAndCreateProject,
}));

const { postUploadPresentationFile } = await import("../../src/controllers/files.controller.js");

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("files upload tests", () => {
  beforeEach(() => {
    mockUploadPresentationAndCreateProject.mockReset();
  });

  test("postUploadPresentationFile returns 201 with projectId on success", async () => {
    mockUploadPresentationAndCreateProject.mockResolvedValue({ projectId: "123" });

    const req = {
      body: { title: "demo" },
      user: { id: 7n },
      file: { originalname: "deck.pdf" },
    };
    const res = createRes();
    const next = jest.fn();

    await postUploadPresentationFile(req, res, next);

    expect(mockUploadPresentationAndCreateProject).toHaveBeenCalledWith({
      userId: 7n,
      title: "demo",
      file: { originalname: "deck.pdf" },
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      resultType: "SUCCESS",
      error: null,
      success: { projectId: "123" },
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("postUploadPresentationFile forwards error to next on service failure", async () => {
    const error = new Error("upload failed");
    mockUploadPresentationAndCreateProject.mockRejectedValue(error);

    const req = {
      body: { title: "demo" },
      user: { id: 7n },
      file: { originalname: "deck.pdf" },
    };
    const res = createRes();
    const next = jest.fn();

    await postUploadPresentationFile(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test("postUploadPresentationFile forwards error when req.body is missing", async () => {
    const req = {
      user: { id: 7n },
      file: { originalname: "deck.pdf" },
    };
    const res = createRes();
    const next = jest.fn();

    await postUploadPresentationFile(req, res, next);

    expect(mockUploadPresentationAndCreateProject).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  test("postUploadPresentationFile forwards error when req.user is missing", async () => {
    const req = {
      body: { title: "demo" },
      file: { originalname: "deck.pdf" },
    };
    const res = createRes();
    const next = jest.fn();

    await postUploadPresentationFile(req, res, next);

    expect(mockUploadPresentationAndCreateProject).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });
});
