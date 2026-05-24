import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Load .env.test from project root
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.test") });

// Validate required env vars are present before running tests
const apiKey = process.env.AWSYS_API_KEY;
if (!apiKey) {
  throw new Error(
    "AWSYS_API_KEY is not set. Copy .env.example to .env.test and fill in your staging API key.",
  );
}
