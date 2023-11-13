import Heading from '@/components/typography/heading';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('Heading', () => {
    it('should render a title and subtitle', () => {
        const title = 'This is the title';
        const subtitle = 'This is the subtitle';
        const { getByText } = render(<Heading title={title} subtitle={subtitle} />);
        expect(getByText(title)).toBeInTheDocument();
        expect(getByText(subtitle)).toBeInTheDocument();
    });

    it('should render the title and subtitle in reverse order if reverse prop is true', () => {
        const title = 'This is the title';
        const subtitle = 'This is the subtitle';
        const { getByText } = render(<Heading title={title} subtitle={subtitle} reverse />);
        expect(getByText(subtitle)).toBeInTheDocument();
        expect(getByText(title)).toBeInTheDocument();
    });

    it('should render the title and subtitle in bold if bold prop is true', () => {
        const title = 'This is the title';
        const subtitle = 'This is the subtitle';
        const { getByText } = render(<Heading title={title} subtitle={subtitle} bold />);
        expect(getByText(title).className).toContain('bold');
        expect(getByText(subtitle).className).toContain('bold');
    });

    it('should render the title and subtitle with the specified element type if titleAs and subtitleAs props are provided', () => {
        const title = 'This is the title';
        const subtitle = 'This is the subtitle';
        const { getByTestId } = render(
            <div data-testid="heading">
                <Heading title={title} subtitle={subtitle} titleAs="h2" subtitleAs="h3" />
            </div>
        );
        expect(getByTestId('heading').querySelector('h2')).toBeInTheDocument();
        expect(getByTestId('heading').querySelector('h3')).toBeInTheDocument();
    });

    it('should render the title and subtitle with the specified styles if titleStyle and subtitleStyle props are provided', () => {
        const title = 'This is the title';
        const subtitle = 'This is the subtitle';
        const { getByText } = render(
            <Heading
                title={title}
                subtitle={subtitle}
                titleStyle={{ color: 'rgb(255, 0, 0)' }}
                subtitleStyle={{ color: 'rgb(0, 0, 255)' }}
            />
        );
        expect(getByText(title)).toHaveStyle('color: rgb(255, 0, 0)');
        expect(getByText(subtitle)).toHaveStyle('color: rgb(0, 0, 255)');
    });

    it('should render the title and subtitle with the specified class names if titleClassName and subtitleClassName props are provided', () => {
        const title = 'This is the title';
        const subtitle = 'This is the subtitle';
        const { getByText } = render(
            <Heading
                title={title}
                subtitle={subtitle}
                titleClassName="title-class"
                subtitleClassName="subtitle-class"
            />
        );
        expect(getByText(title)).toHaveClass('title-class');
        expect(getByText(subtitle)).toHaveClass('subtitle-class');
    });
});
