import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';
import { Card } from '@/components/layout/card';
import PageContent from '@/components/page-content';

import { BLOCK_STYLES } from './page';

export default function ProductPageLoading() {
    return (
        <>
            <div className="-mb-[1.25rem] empty:hidden md:-mb-[2.25rem]">
                <BreadcrumbsSkeleton />
            </div>
            <PageContent as="section" primary={true}>
                <section className="flex w-full flex-col gap-2 overflow-hidden md:max-w-[32rem] 2xl:w-auto">
                    <div className="h-24 w-full" data-skeleton />
                </section>

                <Card className={BLOCK_STYLES}>
                    <div className="flex h-auto w-full flex-col justify-start gap-3">
                        <header className="flex flex-col gap-3">
                            <div className="flex grow flex-col gap-0">
                                <div className="flex w-full grow flex-wrap whitespace-pre-wrap text-3xl font-extrabold leading-tight">
                                    <div className="h-6 w-24" data-skeleton />
                                </div>
                            </div>
                            <div className="h-4 w-24" data-skeleton />
                        </header>
                    </div>
                </Card>
            </PageContent>
        </>
    );
}
