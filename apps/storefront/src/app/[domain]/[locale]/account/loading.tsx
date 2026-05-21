import PageContent from '@/components/page-content';

export default function AccountLoading() {
    return (
        <PageContent>
            <div className="space-y-4">
                <div className="h-10 w-2/5 rounded" data-skeleton />
                <div className="h-32 w-full rounded-lg" data-skeleton />
                <div className="h-32 w-full rounded-lg" data-skeleton />
            </div>
        </PageContent>
    );
}
