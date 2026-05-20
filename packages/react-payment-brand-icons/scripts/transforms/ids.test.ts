import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { parse, stringify } from 'svgson';
import { describe, expect, it } from 'vitest';

import { prefixIds } from './ids';

const fixture = (name: string) => resolve(__dirname, '..', '..', 'fixtures', `${name}.svg`);

describe('prefixIds', () => {
    it('prefixes every id with the slug and rewrites url(#…) and xlink:href references', async () => {
        const ast = await parse(await readFile(fixture('gradient'), 'utf8'));
        prefixIds(ast, 'visa');
        const out = stringify(ast);
        expect(out).toContain('id="visa-grad1"');
        expect(out).toContain('id="visa-grad2"');
        expect(out).toContain('fill="url(#visa-grad1)"');
        expect(out).toContain('fill="url(#visa-grad2)"');
        expect(out).toContain('xlink:href="#visa-grad2"');
        expect(out).not.toContain('"#grad1"');
        expect(out).not.toContain('"#grad2"');
        expect(out).not.toContain('id="grad1"');
        expect(out).not.toContain('id="grad2"');
    });

    it('is a no-op when there are no ids', async () => {
        const ast = await parse('<svg viewBox="0 0 1 1"><path d="M0 0h1v1H0z"/></svg>');
        prefixIds(ast, 'noop');
        const out = stringify(ast);
        expect(out).not.toContain('noop-');
    });
});
