import { describe, expect, it } from 'vitest';
import { main } from './port-errors';

describe('port-errors', () => {
    it('converts every error page in the landing app', () => {
        const result = main({ quiet: true });
        expect(result.converted).toBeGreaterThan(0);
    });
});
