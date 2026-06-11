import { describe, expect, it } from 'vitest';

import { lexicalToProseMirror } from '../../../packages/cms/src/editor/richtext/lexical-to-prosemirror';
import { reassembleShreddedFields, shredLocalizedFields } from '../../../packages/convex/convex/cms/i18n_shred';
import { checksumDocument } from '../../../packages/convex/convex/lib/checksum';
import { heading, lexicalDoc, paragraph } from '../fixtures/lexical';
import { groupSideRowsByParent, independentReassembly, type ShreddedSideRowRecord } from './independent-reassembly';

/** A converted multi-locale article field map with a registered shredded field (`articles.body`). */
const fullData = {
    title: { 'en-US': 'Title EN', 'sv-SE': 'Titel SV' },
    slug: 'hello-world',
    body: {
        'en-US': lexicalToProseMirror(lexicalDoc([heading('Hello', 'h1'), paragraph('World')])),
        'sv-SE': lexicalToProseMirror(lexicalDoc([heading('Hej', 'h1'), paragraph('Världen')])),
        'de-DE': lexicalToProseMirror(lexicalDoc([heading('Hallo', 'h1'), paragraph('Welt')])),
    },
};

/**
 * Lifts the runtime shred output into the reconcile-side row records for a single parent.
 *
 * @param parentId - The parent id to stamp on every row.
 * @returns The parent's inline data plus its side-row records, in shred order.
 */
function shredForParent(parentId: string): { inline: Record<string, unknown>; rows: ShreddedSideRowRecord[] } {
    const { inline, sideRows } = shredLocalizedFields('articles', fullData);
    return {
        inline,
        rows: sideRows.map((row) => ({ parentId, fieldPath: row.fieldPath, locale: row.locale, value: row.value })),
    };
}

/**
 * A deliberately BUGGY reassembly standing in for a regressed transform: it keeps only the FIRST
 * side row of every field, silently dropping every other locale — the kind of data-losing bug the
 * dual-path reconciliation exists to catch.
 *
 * @param inline - The parent's inline data.
 * @param rows - The parent's side rows.
 * @returns The (wrong) reassembled field map.
 */
function buggedReassembly(inline: Record<string, unknown>, rows: readonly ShreddedSideRowRecord[]) {
    const out: Record<string, unknown> = { ...inline };
    for (const row of rows) {
        if (!(row.fieldPath in out)) out[row.fieldPath] = { [row.locale]: row.value };
    }
    return out;
}

describe('clean-room independent reassembly (CMSDATA-10 keying contract)', () => {
    it('agrees with the runtime shred module byte-for-byte on contract-conforming input', () => {
        const { inline, rows } = shredForParent('parent-a');
        const cleanRoom = independentReassembly(inline, rows);
        const runtime = reassembleShreddedFields(
            inline,
            rows.map(({ fieldPath, locale, value }) => ({ fieldPath, locale, value })),
        );
        expect(JSON.stringify(cleanRoom)).toBe(JSON.stringify(runtime));
        expect(JSON.stringify(cleanRoom)).toBe(JSON.stringify(fullData));
    });

    it('groups a flat staged side-row list per parent preserving row order', () => {
        const { rows: rowsA } = shredForParent('parent-a');
        const { rows: rowsB } = shredForParent('parent-b');
        const grouped = groupSideRowsByParent([...rowsA, ...rowsB]);
        expect([...grouped.keys()]).toEqual(['parent-a', 'parent-b']);
        expect(grouped.get('parent-a')?.map((row) => row.locale)).toEqual(['en-US', 'sv-SE', 'de-DE']);
    });

    it('last-write-wins on a duplicate (fieldPath, locale) slot, matching the runtime', () => {
        const rows: ShreddedSideRowRecord[] = [
            { parentId: 'p', fieldPath: 'body', locale: 'en-US', value: 'stale' },
            { parentId: 'p', fieldPath: 'body', locale: 'en-US', value: 'fresh' },
        ];
        const cleanRoom = independentReassembly({}, rows);
        const runtime = reassembleShreddedFields(
            {},
            rows.map(({ fieldPath, locale, value }) => ({ fieldPath, locale, value })),
        );
        expect(cleanRoom).toEqual({ body: { 'en-US': 'fresh' } });
        expect(cleanRoom).toEqual(runtime);
    });
});

describe('negative proof — an injected transform bug DIVERGES instead of agreeing wrong', () => {
    it('the bugged path checksums differently from the clean-room path (the divergence the gate catches)', async () => {
        const { inline, rows } = shredForParent('parent-a');
        const cleanHash = await checksumDocument(independentReassembly(inline, rows));
        const buggedHash = await checksumDocument(buggedReassembly(inline, rows));
        expect(buggedHash).not.toBe(cleanHash);
    });

    it('a SHARED bugged implementation would mask the bug: bugged-vs-bugged hashes are identical-wrong', async () => {
        // The rationale for the second implementation: had both reconciliation sides reassembled
        // through the same regressed module, the two checksums would still agree (below) and the
        // parity gate would go green on corrupted data. Only the independent path turns the bug
        // into a visible divergence (above).
        const { inline, rows } = shredForParent('parent-a');
        const sideA = await checksumDocument(buggedReassembly(inline, rows));
        const sideB = await checksumDocument(buggedReassembly(inline, rows));
        expect(sideA).toBe(sideB);
        expect(buggedReassembly(inline, rows)).not.toEqual(independentReassembly(inline, rows));
    });
});
