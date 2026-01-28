/**
 * 분석/추적 관련 이벤트 핸들러
 * 조회/이탈 기록 처리 (오아시스 업무)
 */

/**
 * 페이지 조회 기록 처리
 * @param {object} data - { presentationId, sessionId, timestamp }
 */
export const onPageview = async (data) => {
  console.log("[Analytics] 페이지 조회 기록:", data);

  // TODO: DB에 조회 기록 저장
  // analytics.repository.js에서 처리
};

/**
 * 슬라이드 조회 기록 처리
 * @param {object} data - { slideId, sessionId, timestamp }
 */
export const onSlideView = async (data) => {
  console.log("[Analytics] 슬라이드 조회 기록:", data);

  // TODO: DB에 슬라이드 조회 기록 저장
};

/**
 * 영상 재생 이벤트 처리
 * @param {object} data - { videoId, eventType: 'play'|'pause'|'seek', timestamp, currentTime }
 */
export const onVideoEvent = async (data) => {
  console.log("[Analytics] 영상 이벤트 기록:", data);

  // TODO: DB에 영상 이벤트 저장
};

/**
 * 이탈 지점 기록 처리
 * @param {object} data - { sessionId, lastSlideId?, lastVideoTime?, timestamp }
 */
export const onExit = async (data) => {
  console.log("[Analytics] 이탈 지점 기록:", data);

  // TODO: DB에 이탈 기록 저장
};
