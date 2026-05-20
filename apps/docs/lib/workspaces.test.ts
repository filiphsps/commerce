import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { assertUniqueSlugs, discoverWorkspaces } from './workspaces';

const FIXTURE_ROOT = path.resolve(__dirname, '../tests/fixtures/monorepo');

describe('discoverWorkspaces', () => {
    it('finds apps and packages with docs/ + package.json', () => {
        const ws = discoverWorkspaces(FIXTURE_ROOT);
        const slugs = ws.map((w) => w.slug).sort();
        expect(slugs).toEqual(['alpha', 'meta/leaf', 'widget']);
    });

    it('tags type as app or package based on parent dir', () => {
        const ws = discoverWorkspaces(FIXTURE_ROOT);
        expect(ws.find((w) => w.slug === 'widget')?.type).toBe('app');
        expect(ws.find((w) => w.slug === 'alpha')?.type).toBe('package');
        expect(ws.find((w) => w.slug === 'meta/leaf')?.type).toBe('package');
    });

    it('records the workspace root path and docs path', () => {
        const ws = discoverWorkspaces(FIXTURE_ROOT);
        const alpha = ws.find((w) => w.slug === 'alpha');
        expect(alpha?.rootPath).toBe(path.join(FIXTURE_ROOT, 'packages/alpha'));
        expect(alpha?.docsPath).toBe(path.join(FIXTURE_ROOT, 'packages/alpha/docs'));
    });

    it('orders apps first, then packages, alphabetical within each', () => {
        const ws = discoverWorkspaces(FIXTURE_ROOT);
        expect(ws.map((w) => w.slug)).toEqual(['widget', 'alpha', 'meta/leaf']);
    });

    it('throws on duplicate slugs', () => {
        // Synthesize a collision by passing two roots that produce the same slug.
        // We don't actually create a fixture collision; instead, test the
        // collision-detection function in isolation.
        const fakeWorkspaces = [
            { slug: 'foo', type: 'app' as const, rootPath: '/a', docsPath: '/a/docs' },
            { slug: 'foo', type: 'package' as const, rootPath: '/b', docsPath: '/b/docs' },
        ];
        expect(() => assertUniqueSlugs(fakeWorkspaces)).toThrow(
            expect.objectContaining({
                name: 'DuplicateWorkspaceSlugError',
                code: 'GENERIC_DUPLICATE_WORKSPACE_SLUG',
            }),
        );
    });
});
