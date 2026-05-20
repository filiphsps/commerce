import { describe, expect, it } from 'vitest';
import { businessData, footer, header } from './index';

// Pure config introspection. Until Task 16 wires globals through `buildPayloadConfig`,
// the runtime-level checks below would just duplicate what `multi-tenant.test.ts` and
// `multi-tenant-isolation.test.ts` already cover end-to-end — so we don't boot Payload here.
describe('globals (header/footer/businessData)', () => {
    it('exports the three global collections with the expected slugs', () => {
        expect(header.slug).toBe('header');
        expect(footer.slug).toBe('footer');
        expect(businessData.slug).toBe('businessData');
    });
});
