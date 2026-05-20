import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Breadcrumb } from './breadcrumb';

describe('<Breadcrumb />', () => {
    it('renders each segment of the path', () => {
        const { getByText } = render(<Breadcrumb segments={['Packages', 'cms', 'blocks', 'render']} />);
        expect(getByText('Packages')).toBeTruthy();
        expect(getByText('render')).toBeTruthy();
    });

    it('truncates to ellipsis at >4 segments', () => {
        const { container } = render(<Breadcrumb segments={['Packages', 'a', 'b', 'c', 'd', 'e']} maxSegments={4} />);
        expect(container.textContent).toContain('…');
    });

    it('renders nothing extra for an empty segments array', () => {
        const { container } = render(<Breadcrumb segments={[]} />);
        // No <li> children should be rendered when segments is empty.
        expect(container.querySelectorAll('li').length).toBe(0);
    });

    it('renders a single segment without truncation', () => {
        const { getByText, container } = render(<Breadcrumb segments={['Only']} />);
        expect(getByText('Only')).toBeTruthy();
        expect(container.textContent).not.toContain('…');
    });

    it('does not truncate when segments equal maxSegments', () => {
        const { container } = render(<Breadcrumb segments={['a', 'b', 'c']} maxSegments={3} />);
        expect(container.textContent).not.toContain('…');
    });
});
