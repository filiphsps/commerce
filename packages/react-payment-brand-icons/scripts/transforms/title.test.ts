import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { parse } from 'svgson';
import { describe, expect, it } from 'vitest';

import { stripTitleAndAria } from './title';

const fixture = (name: string) => resolve(__dirname, '..', '..', 'fixtures', `${name}.svg`);

describe('stripTitleAndAria', () => {
    it('removes the inline <title> child', async () => {
        const ast = await parse(await readFile(fixture('visa-shape'), 'utf8'));
        stripTitleAndAria(ast);
        expect(ast.children.find((c) => c.name === 'title')).toBeUndefined();
    });

    it('removes aria-labelledby from the root <svg>', async () => {
        const ast = await parse(await readFile(fixture('visa-shape'), 'utf8'));
        stripTitleAndAria(ast);
        expect(ast.attributes['aria-labelledby']).toBeUndefined();
    });

    it('leaves the SVG alone when neither attribute nor child exists', async () => {
        const ast = await parse('<svg viewBox="0 0 1 1"><path d="M0 0h1v1H0z"/></svg>');
        stripTitleAndAria(ast);
        expect(ast.children).toHaveLength(1);
    });
});
