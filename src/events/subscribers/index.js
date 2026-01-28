/**
 * 이벤트 구독자 등록
 * 서버 시작 시 모든 이벤트 핸들러를 등록
 */

import eventBus from "../eventBus.js";
import { EventTypes } from "../eventTypes.js";

// 핸들러 import
import { onCommentCreated, onReactionAdded, onCommentDeleted } from "./notification.handler.js";
import { onPageview, onSlideView, onVideoEvent, onExit } from "./analytics.handler.js";

/**
 * 모든 이벤트 구독 등록
 * index.js에서 서버 시작 시 호출
 */
export const registerSubscribers = async () => {
  console.log("[Subscribers] Registering event handlers...");

  // ========== 알림 관련 구독 ==========
  await eventBus.subscribe(EventTypes.COMMENT_CREATED, onCommentCreated);
  await eventBus.subscribe(EventTypes.COMMENT_DELETED, onCommentDeleted);
  await eventBus.subscribe(EventTypes.REACTION_ADDED, onReactionAdded);

  // ========== 분석/추적 관련 구독 (오아시스 업무) ==========
  await eventBus.subscribe(EventTypes.ANALYTICS_PAGEVIEW, onPageview);
  await eventBus.subscribe(EventTypes.ANALYTICS_SLIDE_VIEW, onSlideView);
  await eventBus.subscribe(EventTypes.ANALYTICS_VIDEO_EVENT, onVideoEvent);
  await eventBus.subscribe(EventTypes.ANALYTICS_EXIT, onExit);

  console.log("[Subscribers] All event handlers registered");
};
