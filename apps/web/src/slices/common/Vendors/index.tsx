import VendorsComponent from '@/components/Vendors';
import PageContent from '@/components/page-content';
import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';
import styles from './vendors.module.scss';

/**
 * Props for `Vendors`.
 */
export type VendorsProps = SliceComponentProps<Content.VendorsSlice>;

/**
 * Component for "Vendors" Slices.
 */
const Vendors = ({ slice, context }: VendorsProps): JSX.Element => {
    return (
        <PageContent
            as="section"
            className={styles.container}
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
        >
            <VendorsComponent data={(context as any)?.prefetch?.vendors} />
        </PageContent>
    );
};

export default Vendors;
