import { jest } from "@jest/globals";

const mockCreateSlideReactionEvent = jest.fn();
const mockCreateVideoReactionEvent = jest.fn();
const mockGetReactionMarkers = jest.fn();

jest.unstable_mockModule("../../src/services/reaction.service.js", () => ({
  createSlideReactionEvent: mockCreateSlideReactionEvent,
  createVideoReactionEvent: mockCreateVideoReactionEvent,
  getReactionMarkers: mockGetReactionMarkers,
  getProjectSlidesReactionSummary: jest.fn(),
  getReactionBuckets: jest.fn(),
  getSlideReactionSummary: jest.fn(),
  getVideoReactionsByTime: jest.fn(),
}));

const {
  handleCreateSlideReaction,
  handleCreateVideoReaction,
  getVideoReactionMarkers,
} = await import("../../src/controllers/reaction.controller.js");

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("reaction.controller QA cases", () => {
  beforeEach(() => {
    mockCreateSlideReactionEvent.mockReset();
    mockCreateVideoReactionEvent.mockReset();
    mockGetReactionMarkers.mockReset();
  });

  test("handleCreateSlideReaction returns success payload", async () => {
    const servicePayload = { reactionId: "1", slideId: "3", emojiType: "fire" };
    mockCreateSlideReactionEvent.mockResolvedValue(servicePayload);

    const req = { params: { slideId: "3" }, body: { emojiType: "fire" }, user: { id: 5n } };
    const res = createRes();
    const next = jest.fn();

    await handleCreateSlideReaction(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      resultType: "SUCCESS",
      error: null,
      success: servicePayload,
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("handleCreateVideoReaction forwards error when user is missing", async () => {
    const req = { params: { videoId: "1" }, body: { emojiType: "fire", timestampMs: 1000 } };
    const res = createRes();
    const next = jest.fn();

    await handleCreateVideoReaction(req, res, next);

    expect(mockCreateVideoReactionEvent).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  test("getVideoReactionMarkers forwards service error", async () => {
    const error = new Error("marker failed");
    mockGetReactionMarkers.mockRejectedValue(error);

    const req = { params: { videoId: "1" }, query: { intervalMs: "5000" } };
    const res = createRes();
    const next = jest.fn();

    await getVideoReactionMarkers(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
