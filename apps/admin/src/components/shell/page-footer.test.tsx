import { describe, expect, it } from 'vitest';
import { PageFooter } from '@/components/shell/page-footer';
import { render, screen } from '@/utils/test/react';

describe('PageFooter', () => {
    it('renders children inside the footer landmark', () => {
        render(
            <PageFooter>
                <button type="button">Save draft</button>
            </PageFooter>,
        );
        expect(screen.getByRole('button', { name: 'Save draft' })).toBeInTheDocument();
    });

    it('carries the data-page-footer attribute', () => {
        const { container } = render(
            <PageFooter>
                <span>x</span>
            </PageFooter>,
        );
        expect(container.querySelector('[data-page-footer]')).toBeInTheDocument();
    });
});
