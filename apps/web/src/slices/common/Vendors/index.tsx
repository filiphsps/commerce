import 'server-only';

import Vendors from '@/components/informational/vendors';
import PageContent from '@/components/page-content';
import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';
import { Suspense } from 'react';
import styles from './vendors.module.scss';

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
            className={styles.container}
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
        >
            <Suspense fallback={<Vendors.skeleton />}>
                <Vendors shop={shop} locale={locale} />
            </Suspense>
        </PageContent>
    );
};

VendorsSlice.displayName = 'Nordcom.Slices.Vendors';
export default VendorsSlice;
