import {
  createSlideReactionDto,
  projectSlideReactionSummaryResponseDTO,
  slideReactionSummaryResponseDTO,
} from "../../src/dtos/reaction.dto.js";

describe("reaction.dto", () => {
  test("createSlideReactionDto returns emojiType", () => {
    expect(createSlideReactionDto({ emojiType: "fire" })).toEqual({ emojiType: "fire" });
  });

  test("slideReactionSummaryResponseDTO includes default zeros", () => {
    const dto = slideReactionSummaryResponseDTO({
      slideId: 1n,
      rows: [{ emojiType: "fire", _count: { _all: 2 } }],
    });

    expect(dto.slideId).toBe("1");
    expect(dto.reactions.fire).toBe(2);
    expect(dto.reactions.good).toBe(0);
    expect(dto.active.fire).toBe(true);
    expect(dto.active.good).toBe(false);
  });

  test("projectSlideReactionSummaryResponseDTO aggregates totals", () => {
    const dto = projectSlideReactionSummaryResponseDTO({
      projectId: 5n,
      rows: [
        { emojiType: "fire", _count: { _all: 2 } },
        { emojiType: "good", _count: { _all: 3 } },
      ],
    });

    expect(dto.projectId).toBe("5");
    expect(dto.totalCount).toBe(5);
    expect(dto.totalReactions.fire).toBe(2);
    expect(dto.totalReactions.good).toBe(3);
  });
});
