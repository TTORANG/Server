import {
  slideDetailResponseDTO,
  slideListResponseDTO,
  slideResponseDTO,
} from "../../src/dtos/slide.dto.js";

describe("slide.dto", () => {
  test("slideListResponseDTO uses image asset and default titles", () => {
    const createdAt = new Date("2026-02-12T00:00:00.000Z");
    const updatedAt = new Date("2026-02-12T00:10:00.000Z");
    const slides = [
      {
        id: 1n,
        projectId: 10n,
        title: null,
        slideNum: 1,
        assets: [
          { assetType: "video", url: "gs://bucket/vid.mp4" },
          { assetType: "image", url: "gs://bucket/img.png" },
        ],
        createdAt,
        updatedAt,
      },
      {
        id: 2n,
        projectId: 10n,
        title: "제목",
        slideNum: 2,
        assets: [{ assetType: "video", url: "gs://bucket/only.mp4" }],
        createdAt,
        updatedAt,
      },
    ];

    const result = slideListResponseDTO(slides);

    expect(result[0]).toEqual({
      slideId: "1",
      projectId: "10",
      title: "슬라이드 1",
      slideNum: 1,
      imageUrl: "https://storage.googleapis.com/bucket/img.png",
      createdAt,
      updatedAt,
    });
    expect(result[1].imageUrl).toBe("https://storage.googleapis.com/bucket/only.mp4");
  });

  test("slideResponseDTO uses main asset and maps ids", () => {
    const updatedAt = new Date("2026-02-12T00:10:00.000Z");
    const dto = slideResponseDTO({
      id: 3n,
      title: "타이틀",
      slideNum: 3,
      assets: [{ assetType: "image", url: "gs://bucket/slide.png" }],
      updatedAt,
    });

    expect(dto).toEqual({
      slideId: "3",
      title: "타이틀",
      slideNum: 3,
      imageUrl: "https://storage.googleapis.com/bucket/slide.png",
      updatedAt,
    });
  });

  test("slideDetailResponseDTO fills title from slideNum", () => {
    const updatedAt = new Date("2026-02-12T00:10:00.000Z");
    const dto = slideDetailResponseDTO(
      {
        id: 4n,
        projectId: 9n,
        title: null,
        slideNum: 4,
        assets: [{ assetType: "image", url: "gs://bucket/detail.png" }],
        updatedAt,
      },
      null,
      "5"
    );

    expect(dto).toEqual({
      slideId: "4",
      projectId: "9",
      title: "슬라이드 4",
      slideNum: 4,
      imageUrl: "https://storage.googleapis.com/bucket/detail.png",
      prevSlideId: null,
      nextSlideId: "5",
      updatedAt,
    });
  });
});
