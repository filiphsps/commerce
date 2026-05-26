import { describe, expect, it } from 'vitest';

import { minifySvg } from './minify';

describe('minifySvg', () => {
    it('strips comments and collapses whitespace', () => {
        const input = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
            <!-- a comment -->
            <path d="M0 0 h10 v10 H0 Z" fill="#ff0000"/>
        </svg>`;
        const output = minifySvg(input);
        expect(output).not.toContain('<!--');
        expect(output.length).toBeLessThan(input.length);
    });

    it('preserves viewBox on the root <svg>', () => {
        const input =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 38 24"><rect width="38" height="24" fill="#000"/></svg>';
        const output = minifySvg(input);
        expect(output).toContain('viewBox="0 0 38 24"');
    });

    it('preserves prefixed ids set by upstream transforms', () => {
        const input =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><linearGradient id="pi-foo-a"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient></defs><rect width="10" height="10" fill="url(#pi-foo-a)"/></svg>';
        const output = minifySvg(input);
        expect(output).toContain('pi-foo-a');
        expect(output).toContain('url(#pi-foo-a)');
    });

    it('keeps multi-element trees intact (defs + path)', () => {
        const input =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><clipPath id="pi-bar-clip"><rect width="5" height="5"/></clipPath></defs><path d="M0 0h10v10H0z" clip-path="url(#pi-bar-clip)"/></svg>';
        const output = minifySvg(input);
        expect(output).toContain('<defs>');
        expect(output).toContain('<path');
        expect(output).not.toMatch(/<svg[^>]*\/>/);
    });
});
