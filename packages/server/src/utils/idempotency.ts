import { getRedis } from "../config/redis.js";
import { getPrisma } from "../db/client.js";
import { Prisma } from "@prisma/client";

const IDEMPOTENCY_PREFIX = "idempotency:";
const IDEMPOTENCY_TTL_SECONDS = 86400; // 24 hours

/**
 * Check if an event has already been processed
 */
export const checkIdempotencyKey = async (
  eventId: string,
): Promise<string | null> => {
  const redis = getRedis();
  const key = `${IDEMPOTENCY_PREFIX}${eventId}`;
  const cached = await redis.get(key);
  return cached;
};

/**
 * Mark an event as processed in Redis.
 */
export const markIdempotencyKey = async (
  eventId: string,
  response: string,
): Promise<void> => {
  const redis = getRedis();
  const key = `${IDEMPOTENCY_PREFIX}${eventId}`;
  await redis.set(key, response, "EX", IDEMPOTENCY_TTL_SECONDS);
};

/**
 * Dual-layer idempotency check.
 * @returns { isDuplicate: boolean, existingAlert: any | null }
 */
export const handleIdempotency = async (
  eventId: string,
  alertData: {
    eventId: string;
    deviceId: string;
    patientId: string;
    severity: string;
    message: string;
    triggeredAt: Date;
  },
): Promise<{ isDuplicate: boolean; existingAlert: any | null }> => {
  // Redis check
  const cached = await checkIdempotencyKey(eventId);
  if (cached) {
    return { isDuplicate: true, existingAlert: JSON.parse(cached) };
  }

  // Attempt DB insert
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
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
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
};
