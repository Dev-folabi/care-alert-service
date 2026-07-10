import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { getPrisma } from "../../db/client";
import { getRedis } from "../../config/redis";
import * as alertService from "./alert.service";
import {
  getCached,
  setCache,
  buildPatientCacheKey,
  invalidatePatientCache,
} from "./alert.cache";

const TEST_PATIENT_ID_1 = "PT-AC-TEST-1";
const TEST_PATIENT_ID_2 = "PT-AC-TEST-2";
const ALERT_PREFIX = "ac-test-";

describe("Alert Access Control", () => {
  let prisma: ReturnType<typeof getPrisma>;
  let clinicianId: string;
  let patient1Id: string;
  let patient2Id: string;
  let patient1AlertId: string;
  let patient2AlertId: string;

  beforeAll(async () => {
    prisma = getPrisma();

    // Create test users
    const bcryptjs = await import("bcryptjs");
    const salt = await bcryptjs.genSalt(10);

    const clinician = await prisma.user.create({
      data: {
        email: "ac-clinician@test.io",
        password: await bcryptjs.hash("password123", salt),
        name: "AC Test Clinician",
        role: "CLINICIAN",
      },
    });
    clinicianId = clinician.id;

    const patient1 = await prisma.user.create({
      data: {
        email: "ac-patient1@test.io",
        password: await bcryptjs.hash("password123", salt),
        name: "AC Test Patient 1",
        role: "PATIENT",
        patientId: TEST_PATIENT_ID_1,
      },
    });
    patient1Id = patient1.id;

    const patient2 = await prisma.user.create({
      data: {
        email: "ac-patient2@test.io",
        password: await bcryptjs.hash("password123", salt),
        name: "AC Test Patient 2",
        role: "PATIENT",
        patientId: TEST_PATIENT_ID_2,
      },
    });
    patient2Id = patient2.id;

    // Create test alerts
    const alert1 = await prisma.alert.create({
      data: {
        eventId: `${ALERT_PREFIX}p1-high-${Date.now()}`,
        deviceId: "DEV-AC-TEST",
        patientId: TEST_PATIENT_ID_1,
        severity: "HIGH",
        message: "Patient 1 HIGH alert",
        triggeredAt: new Date(),
        status: "ACTIVE",
        processedAt: new Date(),
      },
    });
    patient1AlertId = alert1.id;

    const alert2 = await prisma.alert.create({
      data: {
        eventId: `${ALERT_PREFIX}p2-medium-${Date.now()}`,
        deviceId: "DEV-AC-TEST",
        patientId: TEST_PATIENT_ID_2,
        severity: "MEDIUM",
        message: "Patient 2 MEDIUM alert",
        triggeredAt: new Date(),
        status: "ACTIVE",
        processedAt: new Date(),
      },
    });
    patient2AlertId = alert2.id;
  });

  afterAll(async () => {
    await prisma.alert.deleteMany({
      where: { eventId: { startsWith: ALERT_PREFIX } },
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: "ac-" } },
    });
    await prisma.$disconnect();
    // Don't quit Redis — it's shared
  });

  describe("getAlertById — access control", () => {
    it("should allow clinician to view any patient's alert", async () => {
      const alert = await alertService.getAlertById(
        patient1AlertId,
        clinicianId,
        "CLINICIAN",
        null,
      );

      expect(alert).not.toBeNull();
      expect(alert.id).toBe(patient1AlertId);
    });

    it("should allow patient to view their own alert", async () => {
      const alert = await alertService.getAlertById(
        patient1AlertId,
        patient1Id,
        "PATIENT",
        TEST_PATIENT_ID_1,
      );

      expect(alert).not.toBeNull();
      expect(alert.id).toBe(patient1AlertId);
    });

    it("should DENY patient from viewing another patient's alert (403)", async () => {
      try {
        await alertService.getAlertById(
          patient2AlertId,
          patient1Id,
          "PATIENT",
          TEST_PATIENT_ID_1,
        );
        expect.fail("Should have thrown 403");
      } catch (err: any) {
        expect(err.status).toBe(403);
        expect(err.message).toMatch(/not authorized/i);
      }
    });

    it("should return 404 for non-existent alert", async () => {
      try {
        await alertService.getAlertById(
          "00000000-0000-0000-0000-000000000000",
          clinicianId,
          "CLINICIAN",
          null,
        );
        expect.fail("Should have thrown 404");
      } catch (err: any) {
        expect(err.status).toBe(404);
        expect(err.message).toMatch(/not found/i);
      }
    });
  });

  describe("getMyAlerts — patient scoping", () => {
    it("should return only alerts belonging to the patient", async () => {
      const result = await alertService.getMyAlerts(TEST_PATIENT_ID_1, {
        page: 1,
        limit: 20,
      });

      expect(result.alerts.length).toBeGreaterThan(0);
      const allOwn = result.alerts.every(
        (a: any) => a.patientId === TEST_PATIENT_ID_1,
      );
      expect(allOwn).toBe(true);
    });

    it("should NOT return alerts from other patients", async () => {
      const result = await alertService.getMyAlerts(TEST_PATIENT_ID_1, {
        page: 1,
        limit: 20,
      });

      const hasOtherPatient = result.alerts.some(
        (a: any) => a.patientId === TEST_PATIENT_ID_2,
      );
      expect(hasOtherPatient).toBe(false);
    });
  });

  describe("getAllAlerts — clinician view", () => {
    it("should return alerts across all patients", async () => {
      const result = await alertService.getAllAlerts({ page: 1, limit: 100 });

      expect(result.alerts.length).toBeGreaterThanOrEqual(2);
      const patientIds = new Set(result.alerts.map((a: any) => a.patientId));
      expect(patientIds.size).toBeGreaterThanOrEqual(2);
    });
  });
});

describe("Alert Cache", () => {
  let redis: ReturnType<typeof getRedis>;

  beforeAll(async () => {
    redis = getRedis();
  });

  afterAll(async () => {
    // Clean up test cache keys
    const keys = await redis.keys("cache:alerts:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    // Don't quit Redis — it's shared
  });

  beforeEach(async () => {
    const keys = await redis.keys("cache:alerts:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  it("should cache data and retrieve it", async () => {
    const key = buildPatientCacheKey("PT-CACHE-TEST");
    const data = { alerts: [{ id: "test" }], total: 1 };

    await setCache(key, data);
    const cached = await getCached(key);

    expect(cached).not.toBeNull();
    expect(cached).toEqual(data);
  });

  it("should return null for cache miss", async () => {
    const key = buildPatientCacheKey("PT-NONEXISTENT");
    const result = await getCached(key);

    expect(result).toBeNull();
  });

  it("should invalidate patient cache (both patient-specific and all-alerts)", async () => {
    const patientKey = buildPatientCacheKey("PT-INVALIDATE-TEST");

    await setCache(patientKey, { alerts: [{ id: "test" }], total: 1 });
    await setCache("cache:alerts:all", { alerts: [], total: 0 });

    expect(await getCached(patientKey)).not.toBeNull();

    await invalidatePatientCache("PT-INVALIDATE-TEST");

    expect(await getCached(patientKey)).toBeNull();
    expect(await getCached("cache:alerts:all")).toBeNull();
  });

  it("should respect TTL (cache entries have expiry)", async () => {
    const key = buildPatientCacheKey("PT-TTL-TEST");
    await setCache(key, { test: true });

    const ttl = await redis.ttl(key);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);
  });
});
