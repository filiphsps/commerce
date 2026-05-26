import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ICONS } from '../src/generated/icons-map';
import { manifest } from '../src/generated/manifest';

describe('all generated icons render', () => {
    it.each(manifest.map((e) => [e.slug, e.componentName]))('%s (%s)', async (slug) => {
        const loader = ICONS[slug];
        if (!loader) throw new Error(`No loader for slug "${slug}"`);
        const mod = await loader();
        const Icon = mod.default;
        const { container } = render(<Icon />);
        const svg = container.querySelector('svg');
        expect(svg, `${slug} produced no <svg>`).toBeTruthy();
        expect(svg!.getAttribute('viewBox'), `${slug} missing viewBox`).toBeTruthy();
        expect(svg!.innerHTML.length, `${slug} has empty SVG body`).toBeGreaterThan(0);
    });

    it('has the expected number of icons', () => {
        expect(manifest.length).toBeGreaterThanOrEqual(460);
    });
});
