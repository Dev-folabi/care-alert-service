import { getRedis } from "../../config/redis.js";

/**
 * Cache key patterns and invalidation logic for alert-related endpoints.
 *
 * Strategy: Hybrid approach
 *   - Event-driven invalidation (primary): Delete cache keys immediately
 *     when a new alert is created or status changes.
 *   - TTL safety net (fallback): 60-second TTL on all cached entries
 *     so stale data can't persist indefinitely even if an invalidation
 *     event is missed (e.g., Redis blip, worker crash before invalidation).
 *
 * Tradeoff:
 *   - TTL-only: Simple, but can serve stale data for up to TTL duration.
 *     In a clinical context, a clinician missing a new alert for 60s is dangerous.
 *   - Event-only: Always fresh, but if invalidation fails, stale data persists
 *     indefinitely with no self-healing.
 *   - Hybrid (chosen): Event-driven keeps data fresh; TTL is the safety net.
 *     Slightly more code, but the reliability is worth it for clinical data.
 */

const CACHE_PREFIX = "cache:alerts";
const CACHE_TTL_SECONDS = 60; // Safety-net TTL

/**
 * Build cache key for a specific patient's alert history.
 */
export function buildPatientCacheKey(patientId: string): string {
  return `${CACHE_PREFIX}:patient:${patientId}`;
}

/**
 * Build cache key for the all-alerts clinician view.
 * Includes optional query params for filtering.
 */
export function buildAllAlertsCacheKey(query?: string): string {
  return query ? `${CACHE_PREFIX}:all:${query}` : `${CACHE_PREFIX}:all`;
}

/**
 * Get a cached value by key.
 * Returns parsed JSON or null if not found.
 */
export async function getCached<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  const data = await redis.get(key);
  if (data === null) return null;
  return JSON.parse(data) as T;
}

/**
 * Set a cache value with TTL.
 */
export async function setCache(key: string, data: unknown): Promise<void> {
  const redis = getRedis();
  await redis.set(key, JSON.stringify(data), "EX", CACHE_TTL_SECONDS);
}

/**
 * Invalidate all cache entries related to a patient.
 *
 * Called by the BullMQ worker after processing an alert:
 *   - Delete the patient-specific cache
 *   - Delete the all-alerts cache (since it includes this patient's data)
 *
 * We use KEYS pattern matching for the all-alerts cache because
 * query parameter variations create different keys.
 * In production with large datasets, consider maintaining a set
 * of cache keys per patient for O(1) invalidation.
 */
export async function invalidatePatientCache(
  patientId: string
): Promise<void> {
  const redis = getRedis();

  // Delete patient-specific cache
  await redis.del(buildPatientCacheKey(patientId));

  // Delete all clinician-view cache variants
  // KEYS is acceptable here because the number of variants is small
  const allKeys = await redis.keys(`${CACHE_PREFIX}:all*`);
  if (allKeys.length > 0) {
    await redis.del(...allKeys);
  }
}
