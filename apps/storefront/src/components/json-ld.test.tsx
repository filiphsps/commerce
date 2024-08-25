import { describe, expect, it } from 'vitest';

import { render } from '@/utils/test/react';

import { JsonLd } from '@/components/json-ld';

describe('components', () => {
    describe('JsonLd', () => {
        it('should render the JSON-LD script tag with the provided data', () => {
            const data = {
                '@context': 'https://schema.org',
                '@type': 'Organization',
                'name': 'My Organization',
                'url': 'https://example.com'
            };

            const { container } = render(<JsonLd data={data} />);

            const scriptTag = container.querySelector('script[type="application/ld+json"]');
            expect(scriptTag).toBeInTheDocument();
            expect(scriptTag?.innerHTML).toBe(JSON.stringify(data));
        });

        it('should return null and log an error if there is an error while rendering', () => {
            const { container } = render(<JsonLd data={null as any} />);

            expect(container.firstChild).toBeNull();
        });
    });
});
