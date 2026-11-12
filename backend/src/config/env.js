import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../..');

const localEnvPath = path.join(backendRoot, '.env.local');
if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
}

const defaultEnvPath = path.join(backendRoot, '.env');
if (fs.existsSync(defaultEnvPath)) {
    dotenv.config({ path: defaultEnvPath });
}
