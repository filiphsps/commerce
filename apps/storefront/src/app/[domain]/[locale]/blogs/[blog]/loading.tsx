import PageContent from '@/components/page-content';

export default function BlogLoading() {
    return (
        <PageContent>
            <div className="mb-8 h-12 w-3/5 rounded" data-skeleton />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="aspect-[4/3] w-full rounded-lg" data-skeleton />
                ))}
            </div>
        </PageContent>
    );
}
