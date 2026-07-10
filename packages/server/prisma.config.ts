import path from "node:path";
import { config as dotenvConfig } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env so DATABASE_URL is available when prisma CLI runs
dotenvConfig({ path: path.resolve(process.cwd(), ".env") });
dotenvConfig({ path: path.resolve(process.cwd(), "../../.env") }); // monorepo root fallback

export default defineConfig({
  schema: path.resolve("prisma/schema.prisma"),
});
