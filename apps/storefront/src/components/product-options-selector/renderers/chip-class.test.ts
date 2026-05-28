import { describe, expect, it } from 'vitest';
import { chipClassName } from './chip-class';

describe('chipClassName', () => {
    it('always emits the shared chip base classes', () => {
        const cls = chipClassName({ selected: false, available: true, density: 'compact' });
        expect(cls).toContain('inline-flex');
        expect(cls).toContain('rounded-(--block-border-radius-small)');
    });

    it('applies compact sizing for the compact density', () => {
        const cls = chipClassName({ selected: false, available: true, density: 'compact' });
        expect(cls).toContain('min-h-8');
        expect(cls).not.toContain('min-h-12');
    });

    it('applies roomier sizing for the spacious density', () => {
        const cls = chipClassName({ selected: false, available: true, density: 'spacious' });
        expect(cls).toContain('min-h-12');
        expect(cls).not.toContain('min-h-8');
    });

    it('makes an available, unselected chip interactive (pointer cursor + hover lift)', () => {
        const cls = chipClassName({ selected: false, available: true, density: 'compact' });
        expect(cls).toContain('cursor-pointer');
        expect(cls).toContain('motion-safe:hover:-translate-y-px');
        expect(cls).not.toContain('cursor-not-allowed');
        expect(cls).not.toContain('border-(--accent-primary)');
    });

    it('gives a selected chip the accent treatment and drops the hover-lift affordance', () => {
        const cls = chipClassName({ selected: true, available: true, density: 'compact' });
        expect(cls).toContain('border-(--accent-primary)');
        expect(cls).toContain('motion-safe:animate-[chip-stamp');
        // The available-&&-!selected interactive branch must not fire for a selected chip.
        expect(cls).not.toContain('cursor-pointer');
    });

    it('marks an unavailable chip as non-interactive with the hatch fill', () => {
        const cls = chipClassName({ selected: false, available: false, density: 'compact' });
        expect(cls).toContain('cursor-not-allowed');
        expect(cls).toContain('pointer-events-none');
        expect(cls).toContain('repeating-linear-gradient');
        expect(cls).not.toContain('cursor-pointer');
    });

    it('keeps the selected accent even when the value is unavailable', () => {
        const cls = chipClassName({ selected: true, available: false, density: 'spacious' });
        expect(cls).toContain('border-(--accent-primary)');
        expect(cls).toContain('cursor-not-allowed');
        expect(cls).not.toContain('cursor-pointer');
    });
});
