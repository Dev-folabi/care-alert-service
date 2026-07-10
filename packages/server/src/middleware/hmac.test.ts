import { describe, it, expect } from "vitest";
import { computeHmac, safeCompare, verifyHmacSignature } from "../utils/crypto";
import { hmacGuard } from "./hmac";
import { env } from "../config/env";

// Load secret from env
const SECRET = env.WEBHOOK_SECRET;

function createMockReq(overrides: Record<string, any> = {}) {
  return {
    headers: {},
    body: {},
    params: {},
    query: {},
    user: undefined,
    ...overrides,
  } as any;
}

function createMockRes() {
  const res: Record<string, any> = {
    statusCode: 200,
    body: null,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: any) {
      res.body = data;
      return res;
    },
    send(data: any) {
      res.body = data;
      return res;
    },
  };
  return res as any;
}

function createMockNext() {
  const next: any = (err?: any) => {
    next.called = true;
    next.calledWith = err;
  };
  next.called = false;
  next.calledWith = undefined;
  return next;
}

describe("Crypto Utilities", () => {
  describe("computeHmac", () => {
    it("should produce a consistent hex digest", () => {
      const body = '{"test":"payload"}';
      const sig1 = computeHmac(body, SECRET);
      const sig2 = computeHmac(body, SECRET);

      expect(sig1).toBe(sig2);
      expect(sig1).toMatch(/^[0-9a-f]{64}$/); // SHA-256 = 64 hex chars
    });

    it("should produce different digests for different bodies", () => {
      const sig1 = computeHmac('{"a":1}', SECRET);
      const sig2 = computeHmac('{"a":2}', SECRET);

      expect(sig1).not.toBe(sig2);
    });

    it("should produce different digests for different secrets", () => {
      const body = '{"test":"payload"}';
      const sig1 = computeHmac(body, SECRET);
      const sig2 = computeHmac(body, "different-secret");

      expect(sig1).not.toBe(sig2);
    });
  });

  describe("safeCompare", () => {
    it("should return true for identical strings", () => {
      expect(safeCompare("abc123", "abc123")).toBe(true);
    });

    it("should return false for different strings", () => {
      expect(safeCompare("abc123", "abc124")).toBe(false);
    });

    it("should return false for strings of different length", () => {
      expect(safeCompare("abc", "abcd")).toBe(false);
    });
  });

  describe("verifyHmacSignature", () => {
    it("should return true for a valid signature", () => {
      const body = '{"test":"payload"}';
      const hex = computeHmac(body, SECRET);
      const signature = `sha256=${hex}`;

      expect(verifyHmacSignature(body, SECRET, signature)).toBe(true);
    });

    it("should return false for an invalid signature", () => {
      const body = '{"test":"payload"}';
      expect(verifyHmacSignature(body, SECRET, "sha256=invalidhex")).toBe(
        false,
      );
    });

    it("should return false when body is tampered", () => {
      const body = '{"test":"payload"}';
      const hex = computeHmac(body, SECRET);
      const signature = `sha256=${hex}`;

      expect(verifyHmacSignature(body + "x", SECRET, signature)).toBe(false);
    });

    it("should return false when secret is wrong", () => {
      const body = '{"test":"payload"}';
      const hex = computeHmac(body, SECRET);
      const signature = `sha256=${hex}`;

      expect(verifyHmacSignature(body, "wrong-secret", signature)).toBe(false);
    });

    it("should return false for malformed signature (no sha256= prefix)", () => {
      const body = '{"test":"payload"}';
      expect(verifyHmacSignature(body, SECRET, "invalid-format")).toBe(false);
    });

    it("should return false for empty signature", () => {
      const body = '{"test":"payload"}';
      expect(verifyHmacSignature(body, SECRET, "sha256=")).toBe(false);
    });
  });
});

describe("HMAC Middleware", () => {
  it("should call next() for a valid signature", () => {
    const body =
      '{"eventId":"evt-1","deviceId":"D1","patientId":"PT-1","severity":"high","message":"Test","triggeredAt":"2025-01-01T00:00:00Z"}';
    const hex = computeHmac(body, SECRET);
    const signature = `sha256=${hex}`;

    const req = createMockReq({
      headers: { "x-webhook-signature": signature },
      rawBody: body,
    });
    const res = createMockRes();
    const next = createMockNext();

    hmacGuard(req, res, next);

    expect(next.called).toBe(true);
    expect(next.calledWith).toBeUndefined();
  });

  it("should return 401 for missing signature header", () => {
    const req = createMockReq({
      rawBody: '{"test":true}',
    });
    const res = createMockRes();
    const next = createMockNext();

    hmacGuard(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/missing/i);
    expect(next.called).toBe(false);
  });

  it("should return 401 for invalid signature", () => {
    const req = createMockReq({
      headers: { "x-webhook-signature": "sha256=deadbeef" },
      rawBody: '{"test":true}',
    });
    const res = createMockRes();
    const next = createMockNext();

    hmacGuard(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
    expect(next.called).toBe(false);
  });

  it("should return 401 when raw body is not available", () => {
    const req = createMockReq({
      headers: { "x-webhook-signature": "sha256=abc" },
    });
    const res = createMockRes();
    const next = createMockNext();

    hmacGuard(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next.called).toBe(false);
  });

  it("should return 401 for tampered body", () => {
    const body = '{"eventId":"evt-1"}';
    const hex = computeHmac(body, SECRET);
    const signature = `sha256=${hex}`;

    const req = createMockReq({
      headers: { "x-webhook-signature": signature },
      rawBody: body + "TAMPERED",
    });
    const res = createMockRes();
    const next = createMockNext();

    hmacGuard(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next.called).toBe(false);
  });
});
