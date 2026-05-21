import PageContent from '@/components/page-content';

export default function CountriesLoading() {
    return (
        <PageContent>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="h-10 w-full rounded" data-skeleton />
                ))}
            </div>
        </PageContent>
    );
}
