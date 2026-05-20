import { describe, expect, it } from 'vitest';

import { rewriteIconList } from './readme-list';
import type { IconManifestEntry } from './types';

const e = (slug: string, name: string, title: string): IconManifestEntry => ({
    slug,
    componentName: name,
    title,
    aliases: [],
});

describe('rewriteIconList', () => {
    it('replaces content between the markers with a markdown table', () => {
        const md = ['# Title', '<!-- BEGIN_ICON_LIST -->', 'stale content', '<!-- END_ICON_LIST -->', 'after'].join(
            '\n',
        );

        const out = rewriteIconList(md, [e('visa', 'Visa', 'Visa'), e('apple_pay', 'ApplePay', 'Apple Pay')]);

        expect(out).toContain('| Slug | Component | Title |');
        expect(out).toContain('| `visa` | `Visa` | Visa |');
        expect(out).toContain('| `apple_pay` | `ApplePay` | Apple Pay |');
        expect(out).not.toContain('stale content');
        expect(out).toMatch(/^# Title/);
        expect(out).toMatch(/after$/);
    });

    it('returns the input unchanged when markers are absent', () => {
        const md = '# README\n\nNo markers here.';
        expect(rewriteIconList(md, [])).toBe(md);
    });

    it('throws when only one marker is present', () => {
        const md = '<!-- BEGIN_ICON_LIST -->\nno end marker';
        expect(() => rewriteIconList(md, [])).toThrow(/marker/);
    });
});
