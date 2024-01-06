import Pagination from '@/components/actionable/pagination';

export type ProductsContentContentProps = {};
export default async function ProductsContent({}: ProductsContentContentProps) {
    return (
        <>
            <Pagination knownFirstPage={0} knownLastPage={0} morePagesAfterKnownLastPage={false} />
        </>
    );
}
