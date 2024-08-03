import 'server-only';

import styles from './vendors.module.scss';
import overflowStyles from '@/styles/horizontal-overflow-scroll.module.scss';

import { cn } from '@/utils/tailwind';

import Vendors from '@/components/informational/vendors';
import PageContent from '@/components/page-content';

import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';

/**
 * Props for `Vendors`.
 */
export type VendorsProps = SliceComponentProps<Content.VendorsSlice, any>;

/**
 * Component for "Vendors" Slices.
 */
const VendorsSlice = async ({ slice, context: { shop, locale } }: VendorsProps) => {
    return (
        <PageContent
            as="section"
            className={cn(styles.container, overflowStyles.container)}
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
        >
            <Vendors shop={shop} locale={locale} />
        </PageContent>
    );
};

VendorsSlice.displayName = 'Nordcom.Slices.Vendors';
export default VendorsSlice;
