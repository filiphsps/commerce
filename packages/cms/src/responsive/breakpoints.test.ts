import { describe, expect, it } from 'vitest';
import { BREAKPOINT_PRESETS, BREAKPOINTS, breakpointLabel, breakpointPrefix, isBreakpoint } from './breakpoints';

describe('BREAKPOINTS', () => {
    it('is the mobile-first scale in ascending order', () => {
        expect(BREAKPOINTS).toEqual(['base', 'sm', 'md', 'lg', 'xl', '2xl']);
    });
});

describe('breakpointLabel', () => {
    it('maps each breakpoint to its human device name', () => {
        expect(breakpointLabel('base')).toBe('Mobile');
        expect(breakpointLabel('sm')).toBe('Large phone');
        expect(breakpointLabel('md')).toBe('Tablet');
        expect(breakpointLabel('lg')).toBe('Laptop');
        expect(breakpointLabel('xl')).toBe('Desktop');
        expect(breakpointLabel('2xl')).toBe('Wide');
    });
});

describe('breakpointPrefix', () => {
    it('returns an empty prefix for base and the Tailwind variant for the rest', () => {
        expect(breakpointPrefix('base')).toBe('');
        expect(breakpointPrefix('md')).toBe('md:');
        expect(breakpointPrefix('2xl')).toBe('2xl:');
    });
});

describe('isBreakpoint', () => {
    it('accepts known breakpoints and rejects everything else', () => {
        expect(isBreakpoint('md')).toBe(true);
        expect(isBreakpoint('base')).toBe(true);
        expect(isBreakpoint('3xl')).toBe(false);
        expect(isBreakpoint('')).toBe(false);
        expect(isBreakpoint(undefined)).toBe(false);
        expect(isBreakpoint(768)).toBe(false);
    });
});

describe('BREAKPOINT_PRESETS', () => {
    it('covers every breakpoint with an ascending, non-overlapping min width', () => {
        expect(BREAKPOINT_PRESETS.map((preset) => preset.breakpoint)).toEqual([...BREAKPOINTS]);
        const widths = BREAKPOINT_PRESETS.map((preset) => preset.minWidth);
        expect(widths).toEqual([0, 640, 768, 1024, 1280, 1536]);
        expect([...widths].sort((a, b) => a - b)).toEqual(widths);
    });
});
