import { jest } from "@jest/globals";

const mockProcessGetSlideDetail = jest.fn();
const mockProcessGetSlides = jest.fn();
const mockProcessPatchSlideTitle = jest.fn();

jest.unstable_mockModule("../../src/services/slide.service.js", () => ({
  processGetSlideDetail: mockProcessGetSlideDetail,
  processGetSlides: mockProcessGetSlides,
  processPatchSlideTitle: mockProcessPatchSlideTitle,
}));

const {
  handleGetSlideDetail,
  handleGetSlides,
  handlePatchSlideTitle,
} = await import("../../src/controllers/slide.controller.js");

const {
  slideDetailResponseDTO,
  slideListResponseDTO,
  slideResponseDTO,
} = await import("../../src/dtos/slide.dto.js");

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("slide.controller", () => {
  beforeEach(() => {
    mockProcessGetSlideDetail.mockReset();
    mockProcessGetSlides.mockReset();
    mockProcessPatchSlideTitle.mockReset();
  });

  test("handleGetSlides returns dto", async () => {
    const slides = [
      {
        id: 1n,
        projectId: 9n,
        title: "슬라이드",
        slideNum: 1,
        assets: [{ assetType: "image", url: "gs://bucket/slide.png" }],
        createdAt: new Date("2026-02-12T00:00:00.000Z"),
        updatedAt: new Date("2026-02-12T00:10:00.000Z"),
      },
    ];
    mockProcessGetSlides.mockResolvedValue(slides);

    const req = { params: { projectId: "9" }, user: { id: 1n } };
    const res = createRes();
    const next = jest.fn();

    await handleGetSlides(req, res, next);

    expect(mockProcessGetSlides).toHaveBeenCalledWith("9", 1n);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      resultType: "SUCCESS",
      error: null,
      success: slideListResponseDTO(slides),
    });
  });

  test("handlePatchSlideTitle forwards errors", async () => {
    const error = new Error("update failed");
    mockProcessPatchSlideTitle.mockRejectedValue(error);

    const req = { params: { slideId: "1" }, body: { title: "수정" }, user: { id: 1n } };
    const res = createRes();
    const next = jest.fn();

    await handlePatchSlideTitle(req, res, next);

    expect(mockProcessPatchSlideTitle).toHaveBeenCalledWith("1", 1n, "수정");
    expect(next).toHaveBeenCalledWith(error);
  });

  test("handleGetSlideDetail returns dto", async () => {
    const slide = {
      id: 2n,
      projectId: 9n,
      title: "상세",
      slideNum: 2,
      assets: [{ assetType: "image", url: "gs://bucket/detail.png" }],
      updatedAt: new Date("2026-02-12T00:10:00.000Z"),
    };
    mockProcessGetSlideDetail.mockResolvedValue({ slide, prevId: null, nextId: "3" });

    const req = { params: { slideId: "2" }, user: { id: 1n } };
    const res = createRes();
    const next = jest.fn();

    await handleGetSlideDetail(req, res, next);

    expect(mockProcessGetSlideDetail).toHaveBeenCalledWith("2", 1n);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      resultType: "SUCCESS",
      error: null,
      success: slideDetailResponseDTO(slide, null, "3"),
    });
  });

  test("handlePatchSlideTitle returns dto on success", async () => {
    const updatedSlide = {
      id: 3n,
      title: "수정됨",
      slideNum: 3,
      assets: [{ assetType: "image", url: "gs://bucket/slide.png" }],
      updatedAt: new Date("2026-02-12T00:10:00.000Z"),
    };
    mockProcessPatchSlideTitle.mockResolvedValue(updatedSlide);

    const req = { params: { slideId: "3" }, body: { title: "수정됨" }, user: { id: 1n } };
    const res = createRes();
    const next = jest.fn();

    await handlePatchSlideTitle(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      resultType: "SUCCESS",
      error: null,
      success: slideResponseDTO(updatedSlide),
    });
  });
});
