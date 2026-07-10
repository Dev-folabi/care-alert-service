import { getRedis } from "../../config/redis";
import { env } from "../../config/env";

const SUPPRESSION_PREFIX = "suppress:";

export type SuppressionAction = "activate" | "suppress";

export interface SuppressionResult {
  action: SuppressionAction;
  count: number;
  threshold: number;
  windowMs: number;
}

/**
 * Pure suppression check, depends on Redis for the counter
 */
export const checkSuppression = async (
  patientId: string,
  severity: string,
): Promise<SuppressionResult> => {
  const threshold = env.SUPPRESSION_THRESHOLD;
  const windowMs = env.SUPPRESSION_WINDOW_MS;

  // MEDIUM and HIGH are never suppressed
  if (severity !== "LOW") {
    return {
      action: "activate",
      count: 0,
      threshold,
      windowMs,
    };
  }

  // LOW severity — check the sliding window counter
  const redis = getRedis();
  const key = `${SUPPRESSION_PREFIX}${patientId}`;

  // Increment counter
  const count = await redis.incr(key);

  // Set TTL only on first increment (starts the window)
  if (count === 1) {
    await redis.expire(key, Math.ceil(windowMs / 1000));
  }

  // Decision: suppress if count exceeds threshold
  const action: SuppressionAction = count > threshold ? "suppress" : "activate";

  return {
    action,
    count,
    threshold,
    windowMs,
  };
};

/**
 * Reset the suppression counter for a patient.
 */
export const resetSuppressionCounter = async (
  patientId: string,
): Promise<void> => {
  const redis = getRedis();
  const key = `${SUPPRESSION_PREFIX}${patientId}`;
  await redis.del(key);
};
