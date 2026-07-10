import Redis from "ioredis";
import { env } from "./env";

let redisInstance: Redis | null = null;

const redisConnectionOptions = {
  maxRetriesPerRequest: null as null,
  enableReadyCheck: true,
};

// Shared Redis instance for general use (caching, idempotency, etc.)

export function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis(env.REDIS_URL, {
      ...redisConnectionOptions,
      retryStrategy(times: number) {
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
    });

    redisInstance.on("error", (err: Error) => {
      console.error("Redis connection error:", err.message);
    });

    redisInstance.on("connect", () => {
      console.log("Redis connected");
    });
  }

  return redisInstance;
}

// Returns Redis connection options for BullMQ
export function getRedisConnectionOptions() {
  return {
    host: env.REDIS_URL.replace("redis://", "").split(":")[0] || "localhost",
    port: parseInt(
      env.REDIS_URL.replace("redis://", "").split(":")[1] || "6379",
      10,
    ),
    ...redisConnectionOptions,
  };
}

export async function disconnectRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
  }
}
