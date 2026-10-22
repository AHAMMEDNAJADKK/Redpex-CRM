import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Comprehensive candidate paths to guarantee .env resolution across all working directories
const candidatePaths = [
  path.resolve(__dirname, '../../.env'),       // backend/.env
  path.resolve(__dirname, '../../../.env'),    // workspace root .env
  path.resolve(process.cwd(), '.env'),         // current working directory .env
  path.resolve(process.cwd(), 'backend', '.env') // cwd/backend/.env
];

for (const p of candidatePaths) {
  try {
    dotenv.config({ path: p });
  } catch (_) {}
}

export default process.env;
