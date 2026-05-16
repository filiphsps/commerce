import { describe, expect, it } from 'vitest';
import { hashToBucket } from './hash';

describe('utils/flags/hash', () => {
    it('returns a value in [0, 100)', () => {
        for (let i = 0; i < 100; i++) {
            const v = hashToBucket(`visitor-${i}`, 'flag-key');
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThan(100);
        }
    });

    it('is deterministic for the same (visitorId, flagKey)', () => {
        const a = hashToBucket('visitor-abc', 'my-flag');
        const b = hashToBucket('visitor-abc', 'my-flag');
        expect(a).toBe(b);
    });

    it('mixes flag key into the hash — two flags bucket the same visitor differently on average', () => {
        let sameBucket = 0;
        for (let i = 0; i < 1000; i++) {
            const a = hashToBucket(`visitor-${i}`, 'flag-a');
            const b = hashToBucket(`visitor-${i}`, 'flag-b');
            if (Math.floor(a / 25) === Math.floor(b / 25)) sameBucket++;
        }
        expect(sameBucket).toBeGreaterThan(150);
        expect(sameBucket).toBeLessThan(400);
    });

    it('distributes ~evenly across the 0-100 range', () => {
        const quartiles = [0, 0, 0, 0];
        for (let i = 0; i < 4000; i++) {
            const v = hashToBucket(`visitor-${i}`, 'flag');
            quartiles[Math.floor(v / 25)]!++;
        }
        for (const c of quartiles) {
            expect(c).toBeGreaterThan(800);
            expect(c).toBeLessThan(1200);
        }
    });
});
