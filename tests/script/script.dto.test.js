import { scriptResponseDTO, scriptVersionResponseDTO } from "../../src/dtos/script.dto.js";

describe("script.dto", () => {
  test("scriptResponseDTO maps ids and defaults scriptText", () => {
    const createdAt = new Date("2026-02-12T00:00:00.000Z");
    const updatedAt = new Date("2026-02-12T00:10:00.000Z");

    const dto = scriptResponseDTO({
      slideId: 9n,
      charCount: 10,
      scriptText: null,
      estimatedDurationSeconds: 2,
      createdAt,
      updatedAt,
    });

    expect(dto).toEqual({
      slideId: "9",
      charCount: 10,
      scriptText: "",
      estimatedDurationSeconds: 2,
      createdAt,
      updatedAt,
    });
  });

  test("scriptVersionResponseDTO maps version list", () => {
    const list = [
      {
        versionNumber: 2,
        scriptText: "v2",
        charCount: 2,
        createdAt: new Date("2026-02-12T00:01:00.000Z"),
      },
      {
        versionNumber: 1,
        scriptText: "v1",
        charCount: 1,
        createdAt: new Date("2026-02-12T00:00:00.000Z"),
      },
    ];

    expect(scriptVersionResponseDTO(list)).toEqual(list);
  });
});
