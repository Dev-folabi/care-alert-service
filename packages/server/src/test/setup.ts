// Load env vars before any module imports
import dotenv from "dotenv";
import path from "path";

const rootDir = process.cwd();
dotenv.config({ path: path.resolve(rootDir, ".env") });
dotenv.config({ path: path.resolve(rootDir, "../../.env") });
