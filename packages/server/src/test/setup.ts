/**
 * Global test setup for Vitest.
 *
 * - Loads environment variables
 * - Provides shared test utilities
 */

// Load env vars before any module imports
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
