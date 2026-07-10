import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { getPrisma } from "../db/client";
import { getRedis } from "../config/redis";
import {
  handleIdempotency,
  checkIdempotencyKey,
  markIdempotencyKey,
} from "./idempotency";

const TEST_PREFIX = "idempotency-test-";

describe("Idempotency", () => {
  let prisma: ReturnType<typeof getPrisma>;

  beforeAll(async () => {
    prisma = getPrisma();
  });

  afterAll(async () => {
    await prisma.alert.deleteMany({
      where: { eventId: { startsWith: TEST_PREFIX } },
    });
    await prisma.$disconnect();
  });

  describe("checkIdempotencyKey / markIdempotencyKey (Redis Layer 1)", () => {
    it("should return null for a key that has not been seen", async () => {
      const result = await checkIdempotencyKey(
        `${TEST_PREFIX}unseen-${Date.now()}`,
      );
      expect(result).toBeNull();
    });

    it("should return cached response after marking as processed", async () => {
      const eventId = `${TEST_PREFIX}mark-${Date.now()}`;
      const response = JSON.stringify({ id: "test", status: "PENDING" });

      await markIdempotencyKey(eventId, response);
      const result = await checkIdempotencyKey(eventId);

      expect(result).toBe(response);
    });

    it("should return null for a different key", async () => {
      const eventId = `${TEST_PREFIX}mark-other-${Date.now()}`;
      await markIdempotencyKey(eventId, JSON.stringify({ test: true }));

      const result = await checkIdempotencyKey(
        `${TEST_PREFIX}nonexistent-${Date.now()}`,
      );
      expect(result).toBeNull();
    });
  });

  describe("handleIdempotency (Dual-Layer)", () => {
    const uniqueEventId = () =>
      `${TEST_PREFIX}handle-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    beforeEach(async () => {
      await prisma.alert.deleteMany({
        where: { eventId: { startsWith: TEST_PREFIX } },
      });
    });

    it("should create a new alert on first submission (not duplicate)", async () => {
      const eventId = uniqueEventId();
      const result = await handleIdempotency(eventId, {
        eventId,
        deviceId: "DEV-TEST",
        patientId: "PT-001",
        severity: "high",
        message: "Idempotency test",
        triggeredAt: new Date(),
      });

      expect(result.isDuplicate).toBe(false);
      expect(result.existingAlert).not.toBeNull();
      expect(result.existingAlert.eventId).toBe(eventId);
      expect(result.existingAlert.status).toBe("PENDING");
    });

    it("should detect duplicate on second submission (Redis Layer 1)", async () => {
      const eventId = uniqueEventId();

      await handleIdempotency(eventId, {
        eventId,
        deviceId: "DEV-TEST",
        patientId: "PT-001",
        severity: "high",
        message: "Idempotency test",
        triggeredAt: new Date(),
      });

      const result = await handleIdempotency(eventId, {
        eventId,
        deviceId: "DEV-TEST",
        patientId: "PT-001",
        severity: "high",
        message: "Idempotency test duplicate",
        triggeredAt: new Date(),
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.existingAlert).not.toBeNull();
      expect(result.existingAlert.eventId).toBe(eventId);
    });

    it("should catch duplicate via DB unique constraint (Layer 2) when Redis misses", async () => {
      const eventId = uniqueEventId();

      await handleIdempotency(eventId, {
        eventId,
        deviceId: "DEV-TEST",
        patientId: "PT-001",
        severity: "medium",
        message: "Layer 2 test",
        triggeredAt: new Date(),
      });

      // Delete the Redis key to simulate TTL expiry / Redis crash
      const redis = getRedis();
      await redis.del(`idempotency:${eventId}`);

      const result = await handleIdempotency(eventId, {
        eventId,
        deviceId: "DEV-TEST",
        patientId: "PT-001",
        severity: "medium",
        message: "Layer 2 test duplicate",
        triggeredAt: new Date(),
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.existingAlert).not.toBeNull();
      expect(result.existingAlert.eventId).toBe(eventId);
    });

    it("should allow different eventIds to be processed independently", async () => {
      const eventId1 = uniqueEventId();
      const eventId2 = uniqueEventId();

      const result1 = await handleIdempotency(eventId1, {
        eventId: eventId1,
        deviceId: "DEV-TEST",
        patientId: "PT-001",
        severity: "low",
        message: "First event",
        triggeredAt: new Date(),
      });

      const result2 = await handleIdempotency(eventId2, {
        eventId: eventId2,
        deviceId: "DEV-TEST",
        patientId: "PT-002",
        severity: "high",
        message: "Second event",
        triggeredAt: new Date(),
      });

      expect(result1.isDuplicate).toBe(false);
      expect(result2.isDuplicate).toBe(false);
      expect(result1.existingAlert.id).not.toBe(result2.existingAlert.id);
    });
  });
});
