import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ProseMirrorDocument, ProseMirrorNode } from '../packages/cms/src/editor/richtext/lexical-to-prosemirror';
import {
    type CorpusItem,
    collectDumpCorpus,
    collectGoldenCorpus,
    collectInRepoCorpus,
    formatRunReport,
    isRed,
    loadProseMirrorRenderer,
    type ProseMirrorRenderer,
    runFidelityCheck,
} from './richtext-fidelity-check';

// The G-RICH kill-gate's own contract tests: a known-good corpus passes, a planted semantic
// mutation FAILS, and a planted unknown node QUARANTINES — plus the dump-directory input path the
// cutover run uses and the determinism of the report. The suite runs the LIVE storefront renderer
// (via the scripts Vitest alias for `@/components/link`), so a pass here is the same pipeline the
// CLI run exercises.

let render: ProseMirrorRenderer;

beforeAll(async () => {
    render = await loadProseMirrorRenderer();
});

/**
 * Returns a deep copy of a ProseMirror document with the first text node's content tampered —
 * the planted "silently lossy pipeline" the gate must catch.
 *
 * @param document - The document to mutate.
 * @returns The mutated copy.
 */
const tamperFirstText = (document: ProseMirrorDocument): ProseMirrorDocument => {
    const copy = structuredClone(document);
    const visit = (nodes: ProseMirrorNode[]): boolean => {
        for (const node of nodes) {
            if (node.type === 'text' && typeof node.text === 'string') {
                node.text = `${node.text}!tampered`;
                return true;
            }
            if (node.content && visit(node.content)) return true;
        }
        return false;
    };
    visit(copy.content);
    return copy;
};

describe('richtext fidelity gate', () => {
    it('passes the storefront golden corpus (oracle pinned to the pre-rewrite DOM)', () => {
        const items = collectGoldenCorpus();
        expect(items.length).toBeGreaterThanOrEqual(12);
        const result = runFidelityCheck(items, render);
        expect(result.diffs).toEqual([]);
        expect(result.quarantines).toEqual([]);
    });

    it('passes the full in-repo corpus (golden + builders + HARNESS-12 fixture bodies)', async () => {
        const corpus = await collectInRepoCorpus();
        // Every HARNESS-12 body must contribute: 12 golden + 9 builder docs is the floor.
        expect(corpus.items.length).toBeGreaterThan(21);
        expect(corpus.preQuarantines).toEqual([]);
        const result = runFidelityCheck(corpus.items, render);
        expect(result.diffs).toEqual([]);
        expect(result.quarantines).toEqual([]);
        expect(isRed(corpus, result)).toBe(false);
    });

    it('FAILS on a planted semantic mutation in the rendered output', () => {
        const items = collectGoldenCorpus().filter((item) => item.docId === 'paragraph');
        expect(items).toHaveLength(1);
        const tamperingRenderer: ProseMirrorRenderer = (document) => render(tamperFirstText(document));
        const result = runFidelityCheck(items, tamperingRenderer);
        expect(result.quarantines).toEqual([]);
        expect(result.diffs).toHaveLength(1);
        expect(result.diffs[0]).toMatchObject({ kind: 'rendered-dom', docId: 'paragraph' });
        expect(result.diffs[0]?.actual).toContain('tampered');
    });

    it('FAILS when the oracle drifts from a pinned pre-rewrite DOM', () => {
        const [item] = collectGoldenCorpus().filter((candidate) => candidate.docId === 'marks');
        expect(item).toBeDefined();
        if (!item) return;
        const pinned: CorpusItem = { ...item, pinnedLegacyHtml: '<p>not the legacy DOM</p>' };
        const result = runFidelityCheck([pinned], render);
        expect(result.diffs).toHaveLength(1);
        expect(result.diffs[0]).toMatchObject({ kind: 'oracle-pin' });
    });

    it('QUARANTINES a planted unknown node with doc id, field path, and node type', () => {
        const item: CorpusItem = {
            source: 'test',
            collection: 'pages',
            docId: 'doc-with-relationship',
            fieldPath: 'body.en-US',
            lexical: { root: { children: [{ type: 'relationship', relationTo: 'products', value: 'abc' }] } },
        };
        const result = runFidelityCheck([item], render);
        expect(result.diffs).toEqual([]);
        expect(result.quarantines).toHaveLength(1);
        expect(result.quarantines[0]).toMatchObject({
            docId: 'doc-with-relationship',
            fieldPath: 'body.en-US',
            nodeType: 'relationship',
        });
        expect(result.quarantines[0]?.reason).toContain('relationship');
    });

    it('QUARANTINES unconvertible text-format bits (sub/superscript)', () => {
        const item: CorpusItem = {
            source: 'test',
            collection: 'articles',
            docId: 'doc-with-superscript',
            fieldPath: 'body',
            lexical: {
                root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: 'x2', format: 64 }] }] },
            },
        };
        const result = runFidelityCheck([item], render);
        expect(result.quarantines).toHaveLength(1);
        expect(result.quarantines[0]).toMatchObject({ nodeType: 'text.format:64' });
    });

    it('collects and checks a mongoexport-format dump directory (the cutover input)', () => {
        const dir = mkdtempSync(join(tmpdir(), 'richtext-fidelity-dump-'));
        const good = {
            _id: { $oid: '64b000000000000000000001' },
            title: { 'en-US': 'Hello', 'sv-SE': 'Hej' },
            body: {
                'en-US': {
                    root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Hello world' }] }] },
                },
                'sv-SE': {
                    root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Hej världen' }] }] },
                },
            },
            createdAt: { $date: '2025-01-01T00:00:00Z' },
        };
        const bad = {
            _id: { $oid: '64b000000000000000000002' },
            body: { 'en-US': { root: { children: [{ type: 'upload', relationTo: 'media', value: 'img1' }] } } },
        };
        const native = {
            _id: { $oid: '64b000000000000000000003' },
            body: { type: 'doc', content: [{ type: 'paragraph' }] },
        };
        writeFileSync(
            join(dir, 'pages.jsonl'),
            `${[JSON.stringify(good), JSON.stringify(bad), JSON.stringify(native)].join('\n')}\nnot-json\n`,
        );

        const corpus = collectDumpCorpus(dir);
        expect(corpus.items).toHaveLength(3);
        expect(corpus.items.map((item) => item.fieldPath)).toEqual(['body.en-US', 'body.sv-SE', 'body.en-US']);
        expect(corpus.proseMirrorNative).toBe(1);
        expect(corpus.preQuarantines).toHaveLength(1);
        expect(corpus.preQuarantines[0]).toMatchObject({ nodeType: 'unparsable-json' });

        const result = runFidelityCheck(corpus.items, render);
        expect(result.diffs).toEqual([]);
        expect(result.quarantines).toHaveLength(1);
        expect(result.quarantines[0]).toMatchObject({
            collection: 'pages',
            docId: '64b000000000000000000002',
            fieldPath: 'body.en-US',
            nodeType: 'upload',
        });
        expect(isRed(corpus, result)).toBe(true);
    });

    it('produces a byte-identical report across runs (deterministic, no wall-clock state)', async () => {
        const first = await collectInRepoCorpus();
        const second = await collectInRepoCorpus();
        const firstReport = formatRunReport(first, runFidelityCheck(first.items, render));
        const secondReport = formatRunReport(second, runFidelityCheck(second.items, render));
        expect(firstReport).toBe(secondReport);
        expect(firstReport.endsWith('PASS\n')).toBe(true);
        expect(firstReport).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
    });
});
