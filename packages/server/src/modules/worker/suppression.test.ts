import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { checkSuppression, resetSuppressionCounter } from "./suppression";

const TEST_PATIENT_1 = "PT-SUPPRESS-TEST-1";
const TEST_PATIENT_2 = "PT-SUPPRESS-TEST-2";

describe("Suppression Logic", () => {
  beforeAll(async () => {
    await resetSuppressionCounter(TEST_PATIENT_1);
    await resetSuppressionCounter(TEST_PATIENT_2);
  });

  afterAll(async () => {
    await resetSuppressionCounter(TEST_PATIENT_1);
    await resetSuppressionCounter(TEST_PATIENT_2);
  });

  describe("HIGH severity", () => {
    it("should always activate regardless of counter", async () => {
      const result = await checkSuppression(TEST_PATIENT_1, "HIGH");
      expect(result.action).toBe("activate");
    });

    it("should always activate — second call too", async () => {
      const result = await checkSuppression(TEST_PATIENT_1, "HIGH");
      expect(result.action).toBe("activate");
    });
  });

  describe("MEDIUM severity", () => {
    it("should always activate regardless of counter", async () => {
      const result = await checkSuppression(TEST_PATIENT_1, "MEDIUM");
      expect(result.action).toBe("activate");
    });
  });

  describe("LOW severity — sliding window", () => {
    const patient = "PT-LOW-SUPPRESS";

    beforeAll(async () => {
      await resetSuppressionCounter(patient);
    });

    afterAll(async () => {
      await resetSuppressionCounter(patient);
    });

    it("LOW #1 → activate (count: 1)", async () => {
      const result = await checkSuppression(patient, "LOW");
      expect(result.action).toBe("activate");
      expect(result.count).toBe(1);
    });

    it("LOW #2 → activate (count: 2)", async () => {
      const result = await checkSuppression(patient, "LOW");
      expect(result.action).toBe("activate");
      expect(result.count).toBe(2);
    });

    it("LOW #3 → activate (count: 3 = threshold)", async () => {
      const result = await checkSuppression(patient, "LOW");
      expect(result.action).toBe("activate");
      expect(result.count).toBe(3);
    });

    it("LOW #4 → suppress (count: 4 > threshold of 3)", async () => {
      const result = await checkSuppression(patient, "LOW");
      expect(result.action).toBe("suppress");
      expect(result.count).toBe(4);
    });

    it("LOW #5 → suppress (count: 5 > threshold)", async () => {
      const result = await checkSuppression(patient, "LOW");
      expect(result.action).toBe("suppress");
      expect(result.count).toBe(5);
    });
  });

  describe("Independent patient counters", () => {
    it("should track counters independently per patient", async () => {
      await resetSuppressionCounter(TEST_PATIENT_1);
      await resetSuppressionCounter(TEST_PATIENT_2);

      // Patient 1: 3 LOW alerts → all activate
      const r1 = await checkSuppression(TEST_PATIENT_1, "LOW");
      const r2 = await checkSuppression(TEST_PATIENT_1, "LOW");
      const r3 = await checkSuppression(TEST_PATIENT_1, "LOW");

      expect(r1.action).toBe("activate");
      expect(r2.action).toBe("activate");
      expect(r3.action).toBe("activate");

      // Patient 2: first LOW → activate (counter starts at 1)
      const r4 = await checkSuppression(TEST_PATIENT_2, "LOW");
      expect(r4.action).toBe("activate");
      expect(r4.count).toBe(1);

      // Patient 1: 4th LOW → suppress
      const r5 = await checkSuppression(TEST_PATIENT_1, "LOW");
      expect(r5.action).toBe("suppress");
      expect(r5.count).toBe(4);
    });
  });

  describe("Counter reset", () => {
    it("should reset the suppression counter for a patient", async () => {
      const patient = "PT-RESET-TEST";

      // Burn through the counter
      await checkSuppression(patient, "LOW");
      await checkSuppression(patient, "LOW");
      await checkSuppression(patient, "LOW");
      await checkSuppression(patient, "LOW");

      const suppressed = await checkSuppression(patient, "LOW");
      expect(suppressed.action).toBe("suppress");

      // Reset
      await resetSuppressionCounter(patient);

      // Should start fresh
      const afterReset = await checkSuppression(patient, "LOW");
      expect(afterReset.action).toBe("activate");
      expect(afterReset.count).toBe(1);

      // Clean up
      await resetSuppressionCounter(patient);
    });
  });
});
