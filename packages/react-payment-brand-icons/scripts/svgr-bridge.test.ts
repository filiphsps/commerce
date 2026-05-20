import { describe, expect, it } from 'vitest';

import { svgToInnerJsx } from './svgr-bridge';

describe('svgToInnerJsx', () => {
    it('camelCases SVG attributes and returns the inner JSX (no <svg> wrapper)', async () => {
        const inner = await svgToInnerJsx('<svg viewBox="0 0 1 1"><path d="M0 0h1v1H0z" fill-rule="evenodd"/></svg>');
        expect(inner).toContain('fillRule="evenodd"');
        expect(inner).toContain('<path');
        expect(inner).not.toContain('<svg');
        expect(inner).not.toContain('</svg>');
    });

    it('handles multi-element SVGs', async () => {
        const inner = await svgToInnerJsx(
            '<svg viewBox="0 0 1 1"><defs><linearGradient id="g"/></defs><path d="M0 0" fill="url(#g)"/></svg>',
        );
        expect(inner).toContain('<defs');
        expect(inner).toContain('<linearGradient');
        expect(inner).toContain('<path');
    });

    it('throws when the wrapper SVG tag is malformed', async () => {
        await expect(svgToInnerJsx('not svg')).rejects.toThrow();
    });
});
