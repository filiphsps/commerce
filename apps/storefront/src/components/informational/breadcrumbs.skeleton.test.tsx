import { describe, expect, it } from 'vitest';

import { render } from '@/utils/test/react';

import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';

describe('components', () => {
    describe('BreadcrumbsSkeleton', () => {
        it('should render', () => {
            const wrapper = render(<BreadcrumbsSkeleton />);

            expect(() => wrapper.unmount()).not.toThrow();
        });
    });
});
