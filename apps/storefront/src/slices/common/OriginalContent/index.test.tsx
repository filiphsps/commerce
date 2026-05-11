import { describe, expect, it } from 'vitest';
import { originalContentFixture } from '@/utils/test/fixtures/prismic/original-content';
import { renderRSC } from '@/utils/test/rsc';
import Slice from './index';

describe('slices/common/OriginalContent', () => {
    it('renders null when no pageContent is provided', async () => {
        const slice = originalContentFixture();
        const result = await renderRSC(() => <Slice slice={slice} context={{}} slices={[slice]} index={0} />);
        expect(result.container.firstChild).toBeNull();
    });

    it('renders provided pageContent', async () => {
        const slice = originalContentFixture();
        const pageContent = <div data-testid="page-content">Page Content Here</div>;
        const result = await renderRSC(() => (
            <Slice slice={slice} context={{ pageContent }} slices={[slice]} index={0} />
        ));
        expect(result.getByTestId('page-content')).toBeTruthy();
    });
});
