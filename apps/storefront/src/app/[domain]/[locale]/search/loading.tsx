import PageContent from '@/components/page-content';

export default function SearchLoading() {
    return (
        <PageContent>
            <div className="flex h-16 overflow-clip rounded-lg bg-white">
                <div
                    className="grow rounded-l-lg border-2 border-gray-300 border-r-0 border-solid px-4 py-2"
                    data-skeleton
                />
                <div className="w-32 rounded-r-lg border-2 border-gray-300 border-l-0 border-solid" data-skeleton />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="aspect-square w-full rounded-lg" data-skeleton />
                ))}
            </div>
        </PageContent>
    );
}
