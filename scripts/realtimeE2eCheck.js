import process from "process";
import { io } from "socket.io-client";
import SuperJSON from "superjson";

const DEFAULT_SERVER_URL = process.env.E2E_SERVER_URL || "http://localhost:8080";
const PROJECT_ID = process.env.E2E_PROJECT_ID;
const JWT_TOKEN = process.env.E2E_JWT_TOKEN || null;
const SESSION_ID = process.env.E2E_SESSION_ID || null;
const TIMEOUT_MS = Number(process.env.E2E_TIMEOUT_MS || 120000);
const EXPECT_EVENTS = (
  process.env.E2E_EXPECT_EVENTS ||
  "new-comment,comment-updated,comment-deleted,new-reaction,reaction-removed,reaction-count-updated"
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const SOCKET_EVENTS = {
  NEW_COMMENT: "new-comment",
  COMMENT_UPDATED: "comment-updated",
  COMMENT_DELETED: "comment-deleted",
  NEW_REACTION: "new-reaction",
  REACTION_REMOVED: "reaction-removed",
  REACTION_COUNT_UPDATED: "reaction-count-updated",
  JOINED_PROJECT: "joined-project",
  ERROR: "error",
};

const EVENT_SCHEMAS = {
  [SOCKET_EVENTS.NEW_COMMENT]: [
    ["projectId", "bigint|string|number"],
    ["commentId", "bigint|string|number"],
    ["targetType", "string|null"],
    ["targetId", "bigint|string|number|null"],
    ["slideId", "bigint|string|number|null"],
    ["videoId", "bigint|string|number|null"],
    ["content", "string"],
    ["parentCommentId", "bigint|string|number|null"],
    ["timestampMs", "number|null"],
  ],
  [SOCKET_EVENTS.COMMENT_UPDATED]: [
    ["projectId", "bigint|string|number"],
    ["commentId", "bigint|string|number"],
    ["targetType", "string|null"],
    ["targetId", "bigint|string|number|null"],
    ["slideId", "bigint|string|number|null"],
    ["videoId", "bigint|string|number|null"],
    ["content", "string"],
    ["parentCommentId", "bigint|string|number|null"],
    ["timestampMs", "number|null"],
  ],
  [SOCKET_EVENTS.COMMENT_DELETED]: [
    ["projectId", "bigint|string|number"],
    ["commentId", "bigint|string|number"],
    ["targetType", "string|null"],
    ["targetId", "bigint|string|number|null"],
    ["slideId", "bigint|string|number|null"],
    ["videoId", "bigint|string|number|null"],
    ["parentCommentId", "bigint|string|number|null"],
    ["timestampMs", "number|null"],
  ],
  [SOCKET_EVENTS.NEW_REACTION]: [
    ["projectId", "bigint|string|number"],
    ["reactionId", "bigint|string|number"],
    ["targetType", "string|null"],
    ["targetId", "bigint|string|number|null"],
    ["slideId", "bigint|string|number|null"],
    ["videoId", "bigint|string|number|null"],
    ["emojiType", "string|null"],
    ["timestampMs", "number|null"],
    ["active", "boolean"],
  ],
  [SOCKET_EVENTS.REACTION_REMOVED]: [
    ["projectId", "bigint|string|number"],
    ["reactionId", "bigint|string|number"],
    ["targetType", "string|null"],
    ["targetId", "bigint|string|number|null"],
    ["slideId", "bigint|string|number|null"],
    ["videoId", "bigint|string|number|null"],
    ["emojiType", "string|null"],
    ["timestampMs", "number|null"],
    ["active", "boolean"],
  ],
  [SOCKET_EVENTS.REACTION_COUNT_UPDATED]: [
    ["projectId", "bigint|string|number"],
    ["targetType", "string"],
    ["targetId", "bigint|string|number|null"],
    ["videoId", "bigint|string|number|null"],
    ["counts", "object"],
    ["totalCount", "number|null"],
  ],
};

const received = new Map();
const payloadErrors = [];

function matchesType(value, spec) {
  if (spec === "string") return typeof value === "string";
  if (spec === "number") return typeof value === "number" && Number.isFinite(value);
  if (spec === "boolean") return typeof value === "boolean";
  if (spec === "object")
    return value !== null && typeof value === "object" && !Array.isArray(value);
  if (spec === "null") return value === null;
  if (spec === "bigint") return typeof value === "bigint";
  if (spec === "string|null") return value === null || typeof value === "string";
  if (spec === "number|null")
    return value === null || (typeof value === "number" && Number.isFinite(value));
  if (spec === "bigint|string|number") {
    return typeof value === "bigint" || typeof value === "string" || typeof value === "number";
  }
  if (spec === "bigint|string|number|null") {
    return (
      value === null ||
      typeof value === "bigint" ||
      typeof value === "string" ||
      typeof value === "number"
    );
  }
  return false;
}

function decodePayload(rawPayload) {
  if (typeof rawPayload !== "string") return rawPayload;
  try {
    return SuperJSON.parse(rawPayload);
  } catch {
    return rawPayload;
  }
}

function validatePayload(event, payload) {
  const schema = EVENT_SCHEMAS[event];
  if (!schema) return;
  if (!payload || typeof payload !== "object") {
    payloadErrors.push(`[${event}] payload must be object`);
    return;
  }

  for (const [field, typeSpec] of schema) {
    if (!(field in payload)) {
      payloadErrors.push(`[${event}] missing field "${field}"`);
      continue;
    }
    if (!matchesType(payload[field], typeSpec)) {
      payloadErrors.push(
        `[${event}] invalid type for "${field}" expected=${typeSpec} actual=${typeof payload[field]}`
      );
    }
  }
}

function summarizeAndExit(socket, code) {
  console.log("");
  console.log("===== Realtime E2E Summary =====");
  console.log(`expected events: ${EXPECT_EVENTS.join(", ")}`);
  for (const event of EXPECT_EVENTS) {
    const count = received.get(event) || 0;
    console.log(`- ${event}: ${count > 0 ? `received(${count})` : "missing"}`);
  }

  if (payloadErrors.length > 0) {
    console.log("");
    console.log("payload validation errors:");
    for (const err of payloadErrors) {
      console.log(`- ${err}`);
    }
  }

  const missing = EXPECT_EVENTS.filter((event) => !received.get(event));
  const hasFailures = missing.length > 0 || payloadErrors.length > 0;

  console.log("");
  console.log(hasFailures ? "RESULT: FAIL" : "RESULT: PASS");
  socket.disconnect();
  process.exit(code ?? (hasFailures ? 1 : 0));
}

if (!PROJECT_ID) {
  console.error("E2E_PROJECT_ID is required.");
  process.exit(1);
}

const socket = io(DEFAULT_SERVER_URL, {
  transports: ["websocket"],
  auth: {
    token: JWT_TOKEN,
    sessionId: SESSION_ID,
  },
});

const trackedEvents = Object.values(SOCKET_EVENTS).filter(
  (event) => event !== SOCKET_EVENTS.JOINED_PROJECT
);

socket.on("connect", () => {
  console.log(`[e2e] connected socket=${socket.id}`);
  socket.emit("join-project", { projectId: PROJECT_ID });
});

socket.on(SOCKET_EVENTS.JOINED_PROJECT, (payload) => {
  console.log(`[e2e] joined project=${payload?.projectId}`);
  console.log("[e2e] now trigger comment/reaction actions from client or API");
});

for (const event of trackedEvents) {
  socket.on(event, (rawPayload) => {
    const payload = decodePayload(rawPayload);
    const current = received.get(event) || 0;
    received.set(event, current + 1);
    console.log(`[e2e] event=${event} count=${current + 1}`);
    validatePayload(event, payload);

    const done = EXPECT_EVENTS.every((expectedEvent) => (received.get(expectedEvent) || 0) > 0);
    if (done && payloadErrors.length === 0) {
      summarizeAndExit(socket, 0);
    }
  });
}

socket.on("connect_error", (error) => {
  console.error(`[e2e] connect_error: ${error.message}`);
});

socket.on(SOCKET_EVENTS.ERROR, (error) => {
  console.error("[e2e] socket error event:", error);
});

setTimeout(() => {
  console.error(`[e2e] timeout after ${TIMEOUT_MS}ms`);
  summarizeAndExit(socket, 1);
}, TIMEOUT_MS);
