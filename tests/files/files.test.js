import { jest } from "@jest/globals";

const mockCreatePresentationUploadUrl = jest.fn();
const mockCompletePresentationUpload = jest.fn();

jest.unstable_mockModule("../../src/services/files.service.js", () => ({
  createPresentationUploadUrl: mockCreatePresentationUploadUrl,
  completePresentationUpload: mockCompletePresentationUpload,
}));

const { postCreateUploadUrl, postCompleteUpload } = await import(
  "../../src/controllers/files.controller.js"
);

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("files.controller", () => {
  beforeEach(() => {
    mockCreatePresentationUploadUrl.mockReset();
    mockCompletePresentationUpload.mockReset();
  });

  test("postCreateUploadUrl returns 201 with signed upload payload", async () => {
    const signed = {
      objectKey: "dev/upload/temp/file.pdf",
      uploadUrl: "https://storage.googleapis.com/...",
      expiresAt: "2026-02-18T00:00:00.000Z",
      uploadToken: "upload-token",
    };
    mockCreatePresentationUploadUrl.mockResolvedValue(signed);

    const req = {
      user: { id: 7n },
      body: {
        purpose: "presentation_file",
        contentType: "application/pdf",
        size: 1024,
        originalFilename: "deck.pdf",
        title: "demo",
      },
    };
    const res = createRes();
    const next = jest.fn();

    await postCreateUploadUrl(req, res, next);

    expect(mockCreatePresentationUploadUrl).toHaveBeenCalledWith({
      userId: 7n,
      purpose: "presentation_file",
      contentType: "application/pdf",
      size: 1024,
      originalFilename: "deck.pdf",
      title: "demo",
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      resultType: "SUCCESS",
      error: null,
      success: signed,
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("postCreateUploadUrl forwards service errors (including required-field failure)", async () => {
    const error = new Error("missing required field");
    mockCreatePresentationUploadUrl.mockRejectedValue(error);

    const req = {
      user: { id: 7n },
      body: {},
    };
    const res = createRes();
    const next = jest.fn();

    await postCreateUploadUrl(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });

  test("postCompleteUpload returns 201 with projectId", async () => {
    mockCompletePresentationUpload.mockResolvedValue({ projectId: "123" });

    const req = {
      user: { id: 7n },
      body: {
        objectKey: "dev/upload/temp/file.pdf",
        uploadToken: "upload-token",
      },
    };
    const res = createRes();
    const next = jest.fn();

    await postCompleteUpload(req, res, next);

    expect(mockCompletePresentationUpload).toHaveBeenCalledWith({
      userId: 7n,
      objectKey: "dev/upload/temp/file.pdf",
      uploadToken: "upload-token",
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      resultType: "SUCCESS",
      error: null,
      success: { projectId: "123" },
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("postCompleteUpload forwards service errors (including required-field failure)", async () => {
    const error = new Error("missing required field");
    mockCompletePresentationUpload.mockRejectedValue(error);

    const req = {
      user: { id: 7n },
      body: {},
    };
    const res = createRes();
    const next = jest.fn();

    await postCompleteUpload(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
