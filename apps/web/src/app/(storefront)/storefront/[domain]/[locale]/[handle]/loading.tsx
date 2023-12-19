import { Page } from '@/components/layout/page';
import PageContent from '@/components/page-content';
import PrismicPage from '@/components/prismic-page';

export default function CustomPageSkeleton() {
    return (
        <Page>
            <PageContent>
                <PrismicPage.skeleton />
            </PageContent>
        </Page>
    );
}
