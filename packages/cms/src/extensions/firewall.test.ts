import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Import specifiers that would breach the Block-loader firewall if a CMS-safe extension module pulled
 * them in: React, Next.js, Shopify, the `server-only` poison pill, or anything reached through the
 * storefront's `@/` alias. The db theme/feature-flag leaves, the errors package, and Payload schemas
 * are explicitly allowed (they are CMS-safe dependencies the package already relies on).
 */
const FORBIDDEN_IMPORT_PATTERNS: ReadonlyArray<readonly [label: string, pattern: RegExp]> = [
    ['react', /\bfrom\s+['"]react(\/[^'"]*)?['"]/],
    ['react-dom', /\bfrom\s+['"]react-dom(\/[^'"]*)?['"]/],
    ['next', /\bfrom\s+['"]next(\/[^'"]*)?['"]/],
    ['shopify', /\bfrom\s+['"][^'"]*shopify[^'"]*['"]/i],
    ['server-only', /\bfrom\s+['"]server-only['"]|\bimport\s+['"]server-only['"]/],
    ['storefront @/ alias', /\bfrom\s+['"]@\/[^'"]*['"]/],
];

const CMS_SAFE_MODULES = ['./manifest.ts', './resolve.ts', './index.ts', './component-settings.ts'] as const;

describe('extension-manifest firewall', () => {
    for (const relativePath of CMS_SAFE_MODULES) {
        it(`${relativePath} imports nothing that breaches the firewall`, () => {
            const source = readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');
            for (const [label, pattern] of FORBIDDEN_IMPORT_PATTERNS) {
                expect(pattern.test(source), `${relativePath} must not import ${label}`).toBe(false);
            }
        });
    }
});
