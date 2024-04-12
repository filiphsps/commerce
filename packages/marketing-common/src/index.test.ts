import { describe, expect, it } from 'vitest';

import { Theme } from './index';

describe('Theme', () => {
    it('should have primary and secondary accents', () => {
        expect(Theme.accents).toHaveProperty('primary');
        expect(Theme.accents).toHaveProperty('secondary');
    });

    it('should have heading and body fonts', () => {
        expect(Theme.fonts).toHaveProperty('heading');
        expect(Theme.fonts).toHaveProperty('body');
    });
});
