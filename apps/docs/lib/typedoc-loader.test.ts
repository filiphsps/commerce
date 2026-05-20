import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { groupSymbols, loadSubpathJson } from './typedoc-loader';

const FIXTURE = path.resolve(__dirname, '../tests/fixtures/typedoc');

describe('loadSubpathJson', () => {
    it('reads and parses a fixture JSON', () => {
        const project = loadSubpathJson(FIXTURE, 'sample');
        expect(project.children?.[0]?.name).toBe('getThing');
    });

    it('throws with a helpful message when subpath JSON is missing', () => {
        expect(() => loadSubpathJson(FIXTURE, 'missing')).toThrow(/No TypeDoc JSON found for subpath "missing"/);
    });
});

describe('groupSymbols', () => {
    it('groups symbols by TypeDoc kind into Functions, Components, etc.', () => {
        const project = loadSubpathJson(FIXTURE, 'sample');
        const groups = groupSymbols(project);
        expect(groups.Functions?.map((s) => s.name)).toEqual(['getThing']);
    });
});
