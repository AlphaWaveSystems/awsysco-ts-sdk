import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Load .env.test from project root
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.test") });

// The staging integration suite is opt-in: it runs only when AWSYS_API_KEY
// is set (copy .env.example to .env.test and fill in a staging API key).
// Test files gate their real-network describe blocks with
// `describe.skipIf(!process.env.AWSYS_API_KEY)` rather than failing here,
// so contract/unit tests stay green offline.
