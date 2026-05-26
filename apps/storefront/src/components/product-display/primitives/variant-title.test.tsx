import { describe, expect, it } from 'vitest';
import { render } from '@/utils/test/react';
import VariantTitle from './variant-title';

const product = (overrides = {}) =>
    ({
        title: 'Soft Cotton Hoodie',
        vendor: 'Mock.shop',
        productType: 'Hoodie',
        handle: 'soft-cotton-hoodie',
        ...overrides,
    }) as any;

describe('VariantTitle', () => {
    it('renders title, vendor eyebrow, and productType when showVendor is true', () => {
        const { getByText } = render(<VariantTitle product={product()} showVendor={true} />);
        expect(getByText('Mock.shop')).toBeTruthy();
        expect(getByText('Soft Cotton Hoodie')).toBeTruthy();
        expect(getByText('Hoodie')).toBeTruthy();
    });

    it('omits vendor when showVendor is false', () => {
        const { queryByText } = render(<VariantTitle product={product()} showVendor={false} />);
        expect(queryByText('Mock.shop')).toBeNull();
    });

    it('omits productType when omitProductType is true', () => {
        const { queryByText } = render(<VariantTitle product={product()} showVendor={false} omitProductType />);
        expect(queryByText('Hoodie')).toBeNull();
    });
});
