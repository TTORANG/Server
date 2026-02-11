import {
  recordingFinishSuccessDTO,
  videoDetailResponseDTO,
  videoListItemDTO,
} from "../../src/dtos/video.dto.js";

describe("video.dto", () => {
  test("videoListItemDTO maps numeric ids and gs url", () => {
    const createdAt = new Date("2026-02-10T01:02:03.000Z");
    const dto = videoListItemDTO({
      id: 10n,
      title: "demo",
      status: "ready",
      durationSeconds: 90,
      thumbnailUrl: "gs://demo-bucket/thumbs/a.png",
      rootCommentCount: null,
      replyCount: undefined,
      feedbackCount: 3,
      reactionCount: 5,
      viewCount: 7,
      createdAt,
    });

    expect(dto).toEqual({
      videoId: "10",
      title: "demo",
      status: "ready",
      durationSeconds: 90,
      rootCommentCount: 0,
      replyCount: 0,
      feedbackCount: 3,
      reactionCount: 5,
      viewCount: 7,
      thumbnailUrl: "https://storage.googleapis.com/demo-bucket/thumbs/a.png",
      createdAt,
    });
  });

  test("videoDetailResponseDTO includes reactions/comments timeline", () => {
    const createdAt = new Date("2026-02-10T01:02:03.000Z");
    const response = videoDetailResponseDTO({
      video: {
        id: 3n,
        title: "detail",
        status: "ready",
        durationSeconds: 120,
        width: 1920,
        height: 1080,
        fps: 30,
        hlsMasterUrl: "gs://demo-bucket/hls/master.m3u8",
        thumbnailUrl: "gs://demo-bucket/thumbs/t.png",
        createdAt,
      },
      reactions: [{ timestampMs: 2000, emojiType: "fire", _count: { _all: 2 } }],
      comments: [
        {
          id: 9n,
          timestampMs: 2000,
          content: "nice",
          createdAt,
          user: { id: 1n, name: "kim" },
        },
      ],
    });

    expect(response.video.videoId).toBe("3");
    expect(response.timeline.reactions[0]).toEqual({
      timestampMs: 2000,
      emojiType: "fire",
      count: 2,
    });
    expect(response.timeline.comments[0].user).toEqual({
      userId: "1",
      name: "kim",
      profileImageUrl: null,
    });
  });

  test("recordingFinishSuccessDTO applies slideCount correction", () => {
    const dto = recordingFinishSuccessDTO({
      videoId: 8n,
      status: "processing",
      slideDurations: [{ slideId: 1n, totalDurationMs: 1000 }],
    });

    expect(dto).toEqual({
      videoId: "8",
      status: "processing",
      slideCount: 2,
      slideDurations: [{ slideId: "1", totalDurationMs: 1000 }],
    });
  });
});
