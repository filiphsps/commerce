import { describe, expect, it } from 'vitest';
import { presetToUse, responsiveProjects } from './playwright';
import { CORE_RESPONSIVE_MATRIX, MOBILE, VIEWPORT_PRESETS } from './presets';

describe('presetToUse', () => {
    it('emits the emulation block for a preset', () => {
        expect(presetToUse(MOBILE)).toEqual({
            viewport: { width: MOBILE.width, height: MOBILE.height },
            deviceScaleFactor: MOBILE.deviceScaleFactor,
            isMobile: true,
            hasTouch: true,
        });
    });

    it('marks non-touch presets as non-mobile', () => {
        const desktop = VIEWPORT_PRESETS.find((p) => !p.touch);
        expect(desktop).toBeDefined();
        if (desktop) {
            const use = presetToUse(desktop);
            expect(use.isMobile).toBe(false);
            expect(use.hasTouch).toBe(false);
        }
    });
});

describe('responsiveProjects', () => {
    it('defaults to the core matrix, prefixing project names', () => {
        const projects = responsiveProjects();
        expect(projects.map((p) => p.name)).toEqual(CORE_RESPONSIVE_MATRIX.map((p) => `responsive:${p.id}`));
    });

    it('merges baseUse under each project emulation block', () => {
        const projects = responsiveProjects({
            presets: [MOBILE],
            baseUse: { storageState: 'state.json', baseURL: 'http://localhost:3000' },
            prefix: 'admin',
        });
        expect(projects).toHaveLength(1);
        expect(projects[0]).toEqual({
            name: 'admin:mobile',
            use: {
                storageState: 'state.json',
                baseURL: 'http://localhost:3000',
                viewport: { width: MOBILE.width, height: MOBILE.height },
                deviceScaleFactor: MOBILE.deviceScaleFactor,
                isMobile: true,
                hasTouch: true,
            },
        });
    });

    it('lets the preset emulation win over a conflicting baseUse viewport', () => {
        const [project] = responsiveProjects({
            presets: [MOBILE],
            baseUse: { viewport: { width: 9999, height: 9999 } },
        });
        expect(project?.use.viewport).toEqual({ width: MOBILE.width, height: MOBILE.height });
    });
});
