import { describe, expect, it } from 'vitest';

import { Locale } from '@/utils/locale';
import { render, waitFor } from '@/utils/test/react';

import { ProductDescription } from '@/components/products/product-description';

describe('components', () => {
    describe('ProductDescription', () => {
        it('renders without errors', async () => {
            const { unmount } = render(
                await ProductDescription({
                    shop: {} as any,
                    locale: Locale.default,
                    product: { descriptionHtml: '' } as any
                })
            );

            await waitFor(() => expect(unmount).not.toThrow());
        });
    });
});
