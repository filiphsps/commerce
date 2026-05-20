import { describe, expect, it } from 'vitest';
import { slotHasContent } from '@/components/shell/slot-has-content';

describe('slotHasContent', () => {
    it('returns false for null', () => {
        expect(slotHasContent(null)).toBe(false);
    });

    it('returns false for undefined', () => {
        expect(slotHasContent(undefined)).toBe(false);
    });

    it('returns false for the boolean false', () => {
        expect(slotHasContent(false)).toBe(false);
    });

    it('returns false for an empty string', () => {
        expect(slotHasContent('')).toBe(false);
    });

    it('returns false for whitespace-only strings', () => {
        expect(slotHasContent('   ')).toBe(false);
    });

    it('returns false for an empty fragment', () => {
        expect(slotHasContent(<></>)).toBe(false);
    });

    it('returns false for a fragment containing only null children', () => {
        expect(slotHasContent(<>{null}</>)).toBe(false);
    });

    it('returns true for a real element', () => {
        expect(slotHasContent(<div>hi</div>)).toBe(true);
    });

    it('returns true for a fragment with real content', () => {
        expect(
            slotHasContent(
                <>
                    <div>hi</div>
                </>,
            ),
        ).toBe(true);
    });

    it('returns true for a non-empty string', () => {
        expect(slotHasContent('hello')).toBe(true);
    });
});
