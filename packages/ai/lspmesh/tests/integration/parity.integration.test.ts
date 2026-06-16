import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { BackendConfig } from '@/config/types';
import { AggregatorEngine } from '@/core/engine';

// Repo root is five levels up from tests/integration/.
const REPO_ROOT = fileURLToPath(new URL('../../../../../', import.meta.url));
const UTILS_ENV = join(REPO_ROOT, 'packages/utils/src/runtime-env.ts');

// Typescript-only: the parity check is about by-name resolution over the real
// monorepo, matching the old lsp-symbols behavior.
const tsBackend: BackendConfig = {
    name: 'typescript',
    command: 'npx',
    args: ['-y', 'typescript-language-server@4.4.1', '--stdio'],
    extensionToLanguage: { '.ts': 'typescript', '.tsx': 'typescriptreact', '.mts': 'typescript', '.cts': 'typescript' },
};

const hasUtils = existsSync(UTILS_ENV);
let engine: AggregatorEngine | undefined;

beforeAll(async () => {
    if (!hasUtils) return;
    engine = new AggregatorEngine({ root: REPO_ROOT.replace(/\/$/, ''), backends: [tsBackend] });
    await engine.init();
}, 180_000);

afterAll(async () => {
    await engine?.dispose();
});

describe.skipIf(!hasUtils)('lspmesh parity vs lsp-symbols (commerce repo)', () => {
    it('resolves isProduction references across multiple definitions including runtime-env.ts', async () => {
        const refs = await engine?.findReferences('isProduction');
        const groups = new Set((refs ?? []).map((r) => r.definedAt));
        expect(groups.size).toBeGreaterThanOrEqual(2);
        expect([...groups].some((g) => g?.includes('packages/utils/src/runtime-env.ts'))).toBe(true);
    }, 180_000);
});
