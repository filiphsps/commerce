import { describe, expect, it } from 'vitest';
import { renderGalleryMdx } from './render-gallery-mdx';

describe('renderGalleryMdx', () => {
    it('emits an IconGallery with one card per component', () => {
        const mdx = renderGalleryMdx({
            workspaceSlug: 'react-payment-brand-icons',
            subpath: 'index',
            rows: [
                { name: 'Visa', kind: 'component', fate: 'own-page', summary: 'Visa card icon.' },
                { name: 'Mastercard', kind: 'component', fate: 'own-page', summary: 'Mastercard card icon.' },
            ],
        });
        expect(mdx).toContain('<IconGallery>');
        expect(mdx).toContain('<IconCard name="Visa" summary="Visa card icon."');
        expect(mdx).toContain('<IconCard name="Mastercard"');
    });
});
