import { Queue } from "bullmq";
import { getRedisConnectionOptions } from "./redis.js";

let alertQueueInstance: Queue | null = null;

export const QUEUE_NAME = "alert-processing";

export function getAlertQueue(): Queue {
  if (!alertQueueInstance) {
    const connection = getRedisConnectionOptions();
    alertQueueInstance = new Queue(QUEUE_NAME, { connection });
    console.log(`✅ BullMQ queue "${QUEUE_NAME}" initialized`);
  }
  return alertQueueInstance;
}
