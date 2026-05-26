import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runCodegen } from './generate';
import type { IconOverrides } from './types';

let dir: string;

const VISA_SVG = `<svg viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" width="38" height="24" aria-labelledby="t">
<title id="t">Visa</title>
<path opacity=".07" d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z"/>
<path fill="#fff" d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32"/>
<path d="M9 9h20v6H9z" fill="#142688"/>
</svg>`;

beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'rpbi-'));
    await writeFile(join(dir, 'visa.svg'), VISA_SVG, 'utf8');
});

afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
});

describe('runCodegen', () => {
    it('discovers svgs, transforms them, and writes generated modules', async () => {
        const overrides: IconOverrides = {};
        const outDir = join(dir, '__generated__');
        const result = await runCodegen({ svgsDir: dir, overrides, outDir });

        expect(result.entries).toHaveLength(1);
        expect(result.entries[0]!.slug).toBe('visa');
        expect(result.entries[0]!.componentName).toBe('Visa');
        expect(result.chromeExceptions).toEqual([]);

        const files = await readdir(join(outDir, 'icons'));
        expect(files).toContain('visa.tsx');

        const iconSource = await readFile(join(outDir, 'icons', 'visa.tsx'), 'utf8');
        expect(iconSource).toContain('export default function Visa');
        expect(iconSource).toContain('IconShell');

        const namesSource = await readFile(join(outDir, 'names.ts'), 'utf8');
        expect(namesSource).toContain("PaymentIconName = 'visa'");

        const mapSource = await readFile(join(outDir, 'icons-map.ts'), 'utf8');
        expect(mapSource).toContain("'visa': () => import('./icons/visa')");

        const indexSource = await readFile(join(outDir, 'index.ts'), 'utf8');
        expect(indexSource).toContain("export { default as Visa } from './icons/visa';");
    });

    it('applies overrides on top of defaults', async () => {
        const overrides: IconOverrides = {
            visa: { componentName: 'VisaCard', title: 'VISA', aliases: ['v'] },
        };
        const outDir = join(dir, '__generated__');
        const result = await runCodegen({ svgsDir: dir, overrides, outDir });
        expect(result.entries[0]!.componentName).toBe('VisaCard');
        expect(result.entries[0]!.title).toBe('VISA');
        expect(result.entries[0]!.aliases).toEqual(['v']);
    });

    it('records chrome exceptions for icons without the chrome pattern', async () => {
        await writeFile(
            join(dir, 'plain.svg'),
            '<svg viewBox="0 0 1 1"><path d="M0 0h1v1H0z" fill="#abc"/></svg>',
            'utf8',
        );
        const overrides: IconOverrides = {};
        const outDir = join(dir, '__generated__');
        const result = await runCodegen({ svgsDir: dir, overrides, outDir });
        expect(result.chromeExceptions).toContain('plain');
    });

    it('throws when an override references a slug with no SVG file', async () => {
        const overrides: IconOverrides = { missing: { componentName: 'Missing' } };
        const outDir = join(dir, '__generated__');
        await expect(runCodegen({ svgsDir: dir, overrides, outDir })).rejects.toThrow(
            /Override .* "missing" .* no matching SVG/,
        );
    });
});
