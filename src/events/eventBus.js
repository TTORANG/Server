/**
 * Redis 기반 Pub/Sub 이벤트 버스
 *   // 이벤트 발행 (Publisher)
 *   eventBus.publish('comment:created', { commentId: 1, projectId: 2 });
 *
 *   // 이벤트 구독 (Subscriber)
 *   eventBus.subscribe('comment:created', (data) => {
 *     console.log('새 댓글:', data);
 *   });
 */

import Redis from "ioredis";

class EventBus {
  constructor() {
    this.publisher = null;
    this.subscriber = null;
    this.handlers = new Map(); // 채널별 핸들러 저장
    this.isConnected = false;
  }

  async connect(redisUrl = process.env.REDIS_URL || "redis://localhost:6379") {
    try {
      // Publisher용 Redis 클라이언트
      this.publisher = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
      });

      // Subscriber용 Redis 클라이언트 (별도 연결 필요)
      this.subscriber = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
      });

      // 연결 이벤트 핸들링
      this.publisher.on("connect", () => {
        console.log("[EventBus] Publisher connected to Redis");
      });

      this.subscriber.on("connect", () => {
        console.log("[EventBus] Subscriber connected to Redis");
        this.isConnected = true;
      });

      this.publisher.on("error", (err) => {
        console.error("[EventBus] Publisher error:", err.message);
      });

      this.subscriber.on("error", (err) => {
        console.error("[EventBus] Subscriber error:", err.message);
      });

      // 메시지 수신 핸들러
      this.subscriber.on("message", (channel, message) => {
        this._handleMessage(channel, message);
      });

      console.log("[EventBus] Initialized successfully");
    } catch (error) {
      console.error("[EventBus] Failed to connect:", error.message);
      // Redis 연결 실패해도 서버는 동작하도록 (graceful degradation)
      this.isConnected = false;
    }
  }

  async publish(channel, data) {
    if (!this.publisher || !this.isConnected) {
      console.warn(`[EventBus] Not connected. Skipping publish to ${channel}`);
      return false;
    }

    try {
      const message = JSON.stringify({
        channel,
        data,
        timestamp: new Date().toISOString(),
      });

      await this.publisher.publish(channel, message);
      console.log(`[EventBus] Published to ${channel}:`, data);
      return true;
    } catch (error) {
      console.error(`[EventBus] Publish error on ${channel}:`, error.message);
      return false;
    }
  }

  async subscribe(channel, handler) {
    if (!this.subscriber) {
      console.warn(`[EventBus] Not connected. Cannot subscribe to ${channel}`);
      return false;
    }

    try {
      // 핸들러 저장
      if (!this.handlers.has(channel)) {
        this.handlers.set(channel, []);
        // Redis 채널 구독
        await this.subscriber.subscribe(channel);
        console.log(`[EventBus] Subscribed to ${channel}`);
      }

      this.handlers.get(channel).push(handler);
      return true;
    } catch (error) {
      console.error(`[EventBus] Subscribe error on ${channel}:`, error.message);
      return false;
    }
  }

  async unsubscribe(channel) {
    if (!this.subscriber) return;

    try {
      await this.subscriber.unsubscribe(channel);
      this.handlers.delete(channel);
      console.log(`[EventBus] Unsubscribed from ${channel}`);
    } catch (error) {
      console.error(`[EventBus] Unsubscribe error on ${channel}:`, error.message);
    }
  }

  _handleMessage(channel, message) {
    const handlers = this.handlers.get(channel);
    if (!handlers || handlers.length === 0) return;

    try {
      const parsed = JSON.parse(message);

      // 등록된 모든 핸들러 실행
      handlers.forEach((handler) => {
        try {
          handler(parsed.data, parsed);
        } catch (handlerError) {
          console.error(`[EventBus] Handler error on ${channel}:`, handlerError.message);
        }
      });
    } catch (parseError) {
      console.error(`[EventBus] Message parse error on ${channel}:`, parseError.message);
    }
  }

  //연결 종료
  async disconnect() {
    if (this.publisher) {
      await this.publisher.quit();
    }
    if (this.subscriber) {
      await this.subscriber.quit();
    }
    this.isConnected = false;
    console.log("[EventBus] Disconnected from Redis");
  }
}

// 싱글톤 인스턴스
const eventBus = new EventBus();

export default eventBus;
