import {
  createProjectResponseDTO,
  projectListResponseDTO,
  projectNameResponseDTO,
  projectResponseDTO,
} from "../../src/dtos/project.dto.js";

describe("project.dto", () => {
  test("createProjectResponseDTO returns message and ids", () => {
    const createdAt = new Date("2026-02-12T10:00:00.000Z");
    const dto = createProjectResponseDTO({
      id: 3n,
      title: "발표 자료",
      createdAt,
    });

    expect(dto).toEqual({
      message: "프로젝트가 생성되었습니다. 변환이 시작됩니다.",
      projectId: "3",
      title: "발표 자료",
      createdAt,
    });
  });

  test("projectResponseDTO returns id and updatedAt", () => {
    const updatedAt = new Date("2026-02-12T11:00:00.000Z");
    const dto = projectResponseDTO({
      id: 9n,
      title: "수정된 제목",
      updatedAt,
    });

    expect(dto).toEqual({
      projectId: "9",
      title: "수정된 제목",
      updatedAt,
    });
  });

  test("projectNameResponseDTO returns id and createdAt", () => {
    const createdAt = new Date("2026-02-10T09:00:00.000Z");
    const dto = projectNameResponseDTO({
      id: 7n,
      title: "조회 제목",
      createdAt,
    });

    expect(dto).toEqual({
      projectId: "7",
      title: "조회 제목",
      createdAt,
    });
  });

  test("projectListResponseDTO maps status and aggregates fields", () => {
    const projects = [
      {
        id: 1n,
        title: "처리 중",
        createdAt: new Date("2026-02-12T00:00:00.000Z"),
        updatedAt: new Date("2026-02-12T00:01:00.000Z"),
        conversionJobs: [{ status: "processing", progress: 45 }],
      },
      {
        id: 2n,
        title: "실패한 발표",
        createdAt: new Date("2026-02-12T00:00:00.000Z"),
        updatedAt: new Date("2026-02-12T00:02:00.000Z"),
        conversionJobs: [{ status: "failed", errorMessage: null }],
      },
      {
        id: 3n,
        title: "완료된 발표",
        createdAt: new Date("2026-02-12T00:00:00.000Z"),
        updatedAt: new Date("2026-02-12T00:03:00.000Z"),
        conversionJobs: [{ status: "completed" }],
        thumbnailUrl: null,
        uploadedFiles: [{ storageUrl: "gs://bucket/thumb.png" }],
        shareLinks: [{ viewCount: 3 }, { viewCount: 7 }],
        slides: [
          { script: { estimatedDurationSeconds: 10 } },
          { script: { estimatedDurationSeconds: 5 } },
        ],
        _count: {
          reactions: 2,
          comments: 4,
        },
      },
    ];

    const result = projectListResponseDTO(projects, 3, "1", "20");

    expect(result.presentations[0].status).toBe("processing");
    expect(result.presentations[0].process_progress).toBe(45);

    expect(result.presentations[1].status).toBe("failed");
    expect(result.presentations[1].errorMessage).toBe("변환 중 오류가 발생했습니다.");

    expect(result.presentations[2]).toEqual(
      expect.objectContaining({
        projectId: "3",
        title: "완료된 발표",
        status: "done",
        thumbnailUrl: "https://storage.googleapis.com/bucket/thumb.png",
        slideCount: 2,
        reactionCount: 2,
        viewCount: 10,
        feedbackCount: 4,
        durationSeconds: 15,
      })
    );

    expect(result.total).toBe(3);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.totalPages).toBe(1);
  });
});
