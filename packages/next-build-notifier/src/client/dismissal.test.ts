import { beforeEach, describe, expect, it } from 'vitest';

import { readDismissed, writeDismissed } from './dismissal';

describe('dismissal', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    it('round-trips a dismissed build id', () => {
        expect(readDismissed('k')).toBeNull();
        writeDismissed('k', 'build-1');
        expect(readDismissed('k')).toBe('build-1');
    });
});
