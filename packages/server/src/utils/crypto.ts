import crypto from "crypto";

/**
 * Compute HMAC-SHA256 of a string payload using the given secret.
 * Returns the hex digest.
 */
export function computeHmac(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Compare two hex strings using timing-safe comparison
 * to prevent timing side-channel attacks.
 *
 * Both strings must be the same length (hex digests always are).
 */
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Full HMAC verification:
 * 1. Compute expected HMAC from raw body + secret
 * 2. Compare with provided signature using timing-safe compare
 *
 * Signature format: "sha256=<hex>"
 */
export function verifyHmacSignature(
  rawBody: string,
  secret: string,
  signature: string
): boolean {
  // Extract hex from "sha256=<hex>" format
  const prefix = "sha256=";
  if (!signature.startsWith(prefix)) {
    return false;
  }

  const providedHex = signature.slice(prefix.length);
  const expectedHex = computeHmac(rawBody, secret);

  return safeCompare(expectedHex, providedHex);
}
