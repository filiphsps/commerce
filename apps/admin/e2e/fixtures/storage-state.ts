import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');

/**
 * Where the Playwright globalSetup writes the authenticated storage state.
 * Consumed by `playwright.config.ts` via `use.storageState`. Kept inside
 * the fixtures dir so it travels with the seed script.
 */
export const STORAGE_STATE_PATH = resolve(__dirname, '.auth-storage-state.json');
