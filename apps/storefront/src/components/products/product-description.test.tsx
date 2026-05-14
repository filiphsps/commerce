import { describe, expect, it } from 'vitest';
import { ProductDescription } from '@/components/products/product-description';
import { Locale } from '@/utils/locale';
import { render, waitFor } from '@/utils/test/react';

describe('components', () => {
    describe('ProductDescription', () => {
        it('renders without errors', async () => {
            const { unmount } = await render(
                await ProductDescription({
                    shop: {} as any,
                    locale: Locale.default,
                    product: { descriptionHtml: '' } as any,
                }),
            );

            await waitFor(() => expect(unmount).not.toThrow());
        });
    });
});
