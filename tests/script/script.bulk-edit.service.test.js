import { jest } from "@jest/globals";

const mockGetProjectSlidesWithScripts = jest.fn();
const mockGetScriptText = jest.fn();
const mockGetScriptVersionList = jest.fn();
const mockPostScriptVersion = jest.fn();
const mockUpdateScriptText = jest.fn();

jest.unstable_mockModule("../../src/repositories/script.repository.js", () => ({
  getProjectSlidesWithScripts: mockGetProjectSlidesWithScripts,
  getScriptText: mockGetScriptText,
  getScriptVersionList: mockGetScriptVersionList,
  postScriptVersion: mockPostScriptVersion,
  updateScriptText: mockUpdateScriptText,
}));

const {
  processBulkEditProjectScripts,
  processGetProjectScripts,
} = await import("../../src/services/script.service.js");

const { ProjectNotFoundError } = await import("../../src/errors/project.error.js");
const {
  ScriptBulkEditDuplicateSlideError,
  ScriptBulkEditPayloadError,
  ScriptBulkEditSlideNotFoundError,
} = await import("../../src/errors/script.error.js");

describe("script.bulk-edit.service", () => {
  beforeEach(() => {
    mockGetProjectSlidesWithScripts.mockReset();
    mockGetScriptText.mockReset();
    mockGetScriptVersionList.mockReset();
    mockPostScriptVersion.mockReset();
    mockUpdateScriptText.mockReset();

    mockGetScriptText.mockResolvedValue(null);
    mockUpdateScriptText.mockImplementation(async (slideId, text, charCount, duration) => ({
      slideId: BigInt(slideId),
      charCount,
      scriptText: text,
      estimatedDurationSeconds: duration,
      createdAt: new Date("2026-02-18T00:00:00.000Z"),
      updatedAt: new Date("2026-02-18T00:00:00.000Z"),
    }));
  });

  test("processGetProjectScripts returns ordered script list", async () => {
    mockGetProjectSlidesWithScripts.mockResolvedValue({
      id: 10n,
      slides: [
        { id: 101n, slideNum: 1n, script: { scriptText: "첫번째" } },
        { id: 102n, slideNum: 2n, script: null },
      ],
    });

    const result = await processGetProjectScripts({
      projectId: "10",
      userId: 5n,
    });

    expect(result).toEqual({
      projectId: "10",
      scripts: [
        { slideId: "101", scriptText: "첫번째" },
        { slideId: "102", scriptText: "" },
      ],
    });
  });

  test("processGetProjectScripts throws 404 when project is missing", async () => {
    mockGetProjectSlidesWithScripts.mockResolvedValue(null);

    await expect(
      processGetProjectScripts({
        projectId: "999",
        userId: 5n,
      })
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });

  test("processBulkEditProjectScripts updates and counts unchanged scripts", async () => {
    mockGetProjectSlidesWithScripts.mockResolvedValue({
      id: 11n,
      slides: [
        { id: 201n, slideNum: 1n, script: { scriptText: "기존1" } },
        { id: 202n, slideNum: 2n, script: { scriptText: "기존2" } },
      ],
    });

    mockGetScriptText.mockImplementation(async (slideId) => {
      if (slideId === "201") {
        return {
          id: 301n,
          slideId: 201n,
          scriptText: "유지",
          charCount: 2,
          estimatedDurationSeconds: 1,
          createdAt: new Date("2026-02-18T00:00:00.000Z"),
          updatedAt: new Date("2026-02-18T00:00:00.000Z"),
        };
      }

      return {
        id: 302n,
        slideId: 202n,
        scriptText: "이전",
        charCount: 2,
        estimatedDurationSeconds: 1,
        createdAt: new Date("2026-02-18T00:00:00.000Z"),
        updatedAt: new Date("2026-02-18T00:00:00.000Z"),
      };
    });

    const result = await processBulkEditProjectScripts({
      projectId: "11",
      userId: 5n,
      scripts: [
        { slideId: "201", scriptText: "유지" },
        { slideId: "202", scriptText: "수정" },
      ],
    });

    expect(mockUpdateScriptText).toHaveBeenCalledTimes(1);
    expect(mockUpdateScriptText.mock.calls[0][0]).toBe("202");
    expect(result).toEqual({
      projectId: "11",
      requestedSlideCount: 2,
      updatedSlideCount: 1,
      unchangedSlideCount: 1,
      updatedSlideIds: ["202"],
    });
  });

  test("throws payload error when scripts array is empty", async () => {
    await expect(
      processBulkEditProjectScripts({
        projectId: "11",
        userId: 5n,
        scripts: [],
      })
    ).rejects.toBeInstanceOf(ScriptBulkEditPayloadError);
  });

  test("throws payload error when slideId format is invalid", async () => {
    await expect(
      processBulkEditProjectScripts({
        projectId: "11",
        userId: 5n,
        scripts: [{ slideId: "abc", scriptText: "x" }],
      })
    ).rejects.toBeInstanceOf(ScriptBulkEditPayloadError);
  });

  test("throws duplicate error when slideId is duplicated", async () => {
    await expect(
      processBulkEditProjectScripts({
        projectId: "11",
        userId: 5n,
        scripts: [
          { slideId: "201", scriptText: "a" },
          { slideId: "201", scriptText: "b" },
        ],
      })
    ).rejects.toBeInstanceOf(ScriptBulkEditDuplicateSlideError);
  });

  test("throws 404 when project is missing in bulk edit", async () => {
    mockGetProjectSlidesWithScripts.mockResolvedValue(null);

    await expect(
      processBulkEditProjectScripts({
        projectId: "404",
        userId: 5n,
        scripts: [{ slideId: "1", scriptText: "a" }],
      })
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });

  test("throws slide not found error when payload has slide outside project", async () => {
    mockGetProjectSlidesWithScripts.mockResolvedValue({
      id: 11n,
      slides: [{ id: 201n, slideNum: 1n, script: { scriptText: "x" } }],
    });

    await expect(
      processBulkEditProjectScripts({
        projectId: "11",
        userId: 5n,
        scripts: [{ slideId: "999", scriptText: "a" }],
      })
    ).rejects.toBeInstanceOf(ScriptBulkEditSlideNotFoundError);
  });
});
