import { getRedis } from "../config/redis.js";
import { getPrisma } from "../db/client.js";
import { Prisma } from "@prisma/client";

const IDEMPOTENCY_PREFIX = "idempotency:";
const IDEMPOTENCY_TTL_SECONDS = 86400; // 24 hours

/**
 * Check if an event has already been processed (Redis fast path).
 * Returns the cached response if found, null otherwise.
 */
export async function checkIdempotencyKey(
  eventId: string
): Promise<string | null> {
  const redis = getRedis();
  const key = `${IDEMPOTENCY_PREFIX}${eventId}`;
  const cached = await redis.get(key);
  return cached;
}

/**
 * Mark an event as processed in Redis.
 * Stores the response JSON with a 24-hour TTL.
 */
export async function markIdempotencyKey(
  eventId: string,
  response: string
): Promise<void> {
  const redis = getRedis();
  const key = `${IDEMPOTENCY_PREFIX}${eventId}`;
  await redis.set(key, response, "EX", IDEMPOTENCY_TTL_SECONDS);
}

/**
 * Dual-layer idempotency check.
 *
 * Layer 1: Redis SET check (fast path)
 *   → eventId exists → return cached response
 *
 * Layer 2: DB unique constraint on eventId (durable fallback)
 *   → If Redis TTL expired or Redis crashed → Prisma insert
 *     throws P2002 unique violation → treat as duplicate
 *
 * @returns { isDuplicate: boolean, existingAlert: any | null }
 */
export async function handleIdempotency(
  eventId: string,
  alertData: {
    eventId: string;
    deviceId: string;
    patientId: string;
    severity: string;
    message: string;
    triggeredAt: Date;
  }
): Promise<{ isDuplicate: boolean; existingAlert: any | null }> {
  // Layer 1: Redis check
  const cached = await checkIdempotencyKey(eventId);
  if (cached) {
    return { isDuplicate: true, existingAlert: JSON.parse(cached) };
  }

  // Layer 2: Attempt DB insert — unique constraint on eventId is the safety net
  const prisma = getPrisma();

  try {
    const alert = await prisma.alert.create({
      data: {
        eventId: alertData.eventId,
        deviceId: alertData.deviceId,
        patientId: alertData.patientId,
        severity: alertData.severity.toUpperCase() as any,
        message: alertData.message,
        triggeredAt: alertData.triggeredAt,
        status: "PENDING" as any,
      },
    });

    return { isDuplicate: false, existingAlert: alert };
  } catch (err) {
    // Prisma unique constraint violation (P2002)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Fetch the existing alert
      const existing = await prisma.alert.findUnique({
        where: { eventId },
      });

      // Also cache it in Redis for future fast-path hits
      if (existing) {
        await markIdempotencyKey(eventId, JSON.stringify(existing));
      }

      return { isDuplicate: true, existingAlert: existing };
    }

    throw err;
  }
}
