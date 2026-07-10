import dotenv from "dotenv";
import path from "path";

// Try loading .env from current directory first, then monorepo root
dotenv.config({ path: path.resolve(__dirname, "../../.env") }); // packages/server/.env
dotenv.config({ path: path.resolve(__dirname, "../../../.env") }); // monorepo root .env

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

export const env = {
  PORT: parseInt(optional("PORT", "3001"), 10),
  NODE_ENV: optional("NODE_ENV", "development"),

  DATABASE_URL: required("DATABASE_URL"),

  REDIS_URL: optional("REDIS_URL", "redis://localhost:6379"),

  JWT_SECRET: required("JWT_SECRET"),
  JWT_EXPIRES_IN: optional("JWT_EXPIRES_IN", "24h"),

  WEBHOOK_SECRET: required("WEBHOOK_SECRET"),

  SUPPRESSION_THRESHOLD: parseInt(optional("SUPPRESSION_THRESHOLD", "3"), 10),
  SUPPRESSION_WINDOW_MS: parseInt(
    optional("SUPPRESSION_WINDOW_MS", "300000"),
    10
  ),

  // Derived
  isDev: process.env.NODE_ENV !== "production",
  isProd: process.env.NODE_ENV === "production",
} as const;
