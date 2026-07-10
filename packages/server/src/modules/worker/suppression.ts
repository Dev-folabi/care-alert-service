import { getRedis } from "../../config/redis.js";
import { env } from "../../config/env.js";

/**
 * Suppression rule for low-severity alerts.
 *
 * Rule: If a patient has more than SUPPRESSION_THRESHOLD low-severity alerts
 * within a SUPPRESSION_WINDOW_MS sliding window, suppress subsequent ones.
 *
 * MEDIUM and HIGH severity alerts are NEVER suppressed — they could be
 * clinically critical.
 *
 * Implementation:
 *   - Redis key: suppress:{patientId}
 *   - On each LOW alert: INCR the counter
 *   - On first increment: set EXPIRE to the window duration
 *   - If counter > threshold: suppress (return action: 'suppress')
 *   - If counter <= threshold: activate (return action: 'activate')
 *   - When TTL expires, the window resets automatically
 */

const SUPPRESSION_PREFIX = "suppress:";

export type SuppressionAction = "activate" | "suppress";

export interface SuppressionResult {
  action: SuppressionAction;
  count: number;
  threshold: number;
  windowMs: number;
}

/**
 * Pure suppression check — depends on Redis for the counter
 * but the logic is isolated and testable.
 */
export async function checkSuppression(
  patientId: string,
  severity: string
): Promise<SuppressionResult> {
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
}

/**
 * Reset the suppression counter for a patient.
 * Useful for testing or manual admin actions.
 */
export async function resetSuppressionCounter(
  patientId: string
): Promise<void> {
  const redis = getRedis();
  const key = `${SUPPRESSION_PREFIX}${patientId}`;
  await redis.del(key);
}
