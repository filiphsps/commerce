import PageContent from '@/components/page-content';

export default function CartLoading() {
    return (
        <PageContent>
            <div className="grid gap-4 md:grid-cols-[1fr_320px]">
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-24 w-full rounded-lg" data-skeleton />
                    ))}
                </div>
                <div className="h-64 w-full rounded-lg" data-skeleton />
            </div>
        </PageContent>
    );
}
