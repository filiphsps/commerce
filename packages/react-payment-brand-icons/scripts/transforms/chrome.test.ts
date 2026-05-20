import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { parse } from 'svgson';
import { describe, expect, it } from 'vitest';

import { stripChrome } from './chrome';

const fixture = (name: string) => resolve(__dirname, '..', '..', 'fixtures', `${name}.svg`);

const loadAst = async (name: string) => parse(await readFile(fixture(name), 'utf8'));

describe('stripChrome', () => {
    it('removes the leading two chrome paths from a card-style icon', async () => {
        const ast = await loadAst('visa-shape');
        const result = stripChrome(ast);
        expect(result.matched).toBe(true);
        expect(ast.children.length).toBe(2); // <title>, single logo <path>
        const remainingPaths = ast.children.filter((c) => c.name === 'path');
        expect(remainingPaths).toHaveLength(1);
        expect(remainingPaths[0]!.attributes.fill).toBe('#142688');
    });

    it('leaves the AST unchanged when the chrome pattern is not present', async () => {
        const ast = await loadAst('no-chrome');
        const before = ast.children.length;
        const result = stripChrome(ast);
        expect(result.matched).toBe(false);
        expect(ast.children.length).toBe(before);
    });
});
