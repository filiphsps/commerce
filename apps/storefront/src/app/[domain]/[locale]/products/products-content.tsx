import { Suspense } from 'react';

import Pagination from '@/components/actionable/pagination';

export type ProductsContentContentProps = {};
export default function ProductsContent({}: ProductsContentContentProps) {
    return (
        <>
            <Suspense>
                <Pagination knownFirstPage={0} knownLastPage={0} morePagesAfterKnownLastPage={false} />
            </Suspense>
        </>
    );
}
