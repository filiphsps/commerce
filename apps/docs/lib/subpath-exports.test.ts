import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveSubpathExports } from './subpath-exports';

const FIXTURE_ROOT = path.resolve(__dirname, '../tests/fixtures/monorepo');

describe('resolveSubpathExports', () => {
    it('returns root entry when exports is a single string', () => {
        const subpaths = resolveSubpathExports(path.join(FIXTURE_ROOT, 'apps/widget'));
        expect(subpaths).toEqual([
            { subpath: '.', sourceFile: path.join(FIXTURE_ROOT, 'apps/widget/src/index.ts') },
        ]);
    });

    it('handles array form (picks first entry that resolves to .ts source)', () => {
        const subpaths = resolveSubpathExports(path.join(FIXTURE_ROOT, 'packages/alpha'));
        const root = subpaths.find((s) => s.subpath === '.');
        expect(root?.sourceFile).toBe(path.join(FIXTURE_ROOT, 'packages/alpha/src/index.ts'));
    });

    it('handles nested subpaths like ./api/sub', () => {
        const subpaths = resolveSubpathExports(path.join(FIXTURE_ROOT, 'packages/alpha'));
        const slugs = subpaths.map((s) => s.subpath).sort();
        expect(slugs).toEqual(['.', './api', './api/sub']);
    });

    it('skips subpaths whose source file does not exist', () => {
        // Construct a synthetic package.json with a broken subpath
        const synthetic = path.join(FIXTURE_ROOT, '..', '_synthetic');
        fs.mkdirSync(path.join(synthetic, 'src/real'), { recursive: true });
        fs.writeFileSync(path.join(synthetic, 'src/real/index.ts'), 'export {};');
        fs.writeFileSync(
            path.join(synthetic, 'package.json'),
            JSON.stringify({
                name: 'x',
                exports: { './real': './src/real/index.ts', './missing': './src/missing/index.ts' },
            }),
        );
        const subpaths = resolveSubpathExports(synthetic);
        expect(subpaths.map((s) => s.subpath)).toEqual(['./real']);
        fs.rmSync(synthetic, { recursive: true });
    });

    it('returns empty array when exports field is missing', () => {
        const synthetic = path.join(FIXTURE_ROOT, '..', '_synthetic2');
        fs.mkdirSync(synthetic, { recursive: true });
        fs.writeFileSync(path.join(synthetic, 'package.json'), JSON.stringify({ name: 'y' }));
        expect(resolveSubpathExports(synthetic)).toEqual([]);
        fs.rmSync(synthetic, { recursive: true });
    });
});
