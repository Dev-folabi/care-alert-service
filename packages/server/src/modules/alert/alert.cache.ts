import { getRedis } from "../../config/redis.js";

/**
 * Cache key patterns and invalidation logic for alert-related endpoints.
 */

const CACHE_PREFIX = "cache:alerts";
const CACHE_TTL_SECONDS = 60;

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

export async function invalidatePatientCache(patientId: string): Promise<void> {
  const redis = getRedis();

  // Delete patient-specific cache
  const exactPatientKey = buildPatientCacheKey(patientId);
  const patientFilterKeys = await redis.keys(`${exactPatientKey}:*`);

  await redis.del(exactPatientKey);
  if (patientFilterKeys.length > 0) {
    await redis.del(...patientFilterKeys);
  }

  // Delete clinician view cache variants
  const allKeys = await redis.keys(`${CACHE_PREFIX}:all*`);
  const keysToDelete = allKeys.filter((key) => {
    const jsonStartIndex = key.indexOf("{");
    if (jsonStartIndex !== -1) {
      try {
        const jsonPart = key.substring(jsonStartIndex);
        const query = JSON.parse(jsonPart);
        if (query.patientId && query.patientId !== patientId) {
          return false;
        }
      } catch (e) {}
    }
    return true;
  });

  if (keysToDelete.length > 0) {
    await redis.del(...keysToDelete);
  }
}
