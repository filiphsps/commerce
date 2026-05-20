import { parse } from 'svgson';
import { describe, expect, it } from 'vitest';

import { stripDimensions } from './dimensions';

describe('stripDimensions', () => {
    it('removes width and height from the root <svg> but keeps viewBox', async () => {
        const ast = await parse('<svg viewBox="0 0 38 24" width="38" height="24"><path d="M0 0"/></svg>');
        stripDimensions(ast);
        expect(ast.attributes.viewBox).toBe('0 0 38 24');
        expect(ast.attributes.width).toBeUndefined();
        expect(ast.attributes.height).toBeUndefined();
    });

    it('throws when the root <svg> has no viewBox', async () => {
        const ast = await parse('<svg width="38" height="24"/>');
        expect(() => stripDimensions(ast)).toThrow(/viewBox/);
    });
});
