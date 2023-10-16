import { Content } from '@prismicio/client';
import { PrismicRichText } from '@prismicio/react';
import type { SliceComponentProps } from '@prismicio/react';
import { styled } from '@linaria/react';

const Container = styled.section`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(24rem, 1fr));
    gap: var(--block-spacer);
`;

const SliceContent = styled.div`
    display: flex;
    flex-direction: column;

    &.left {
        align-items: start;
        text-align: left;
    }
    &.center {
        align-items: center;
        text-align: center;
    }
    &.right {
        align-items: end;
        text-align: right;
    }

    font-size: 3.25rem;
    line-height: 3.5rem;

    @media (min-width: 950px) {
        font-size: 3.75rem;
        line-height: 4rem;
    }
`;

/**
 * Props for `Title`.
 */
export type TitleProps = SliceComponentProps<Content.TitleSlice>;

/**
 * Component for "Title" Slices.
 */
const Title = ({ slice }: TitleProps): JSX.Element => {
    return (
        <Container data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
            <SliceContent className={slice.primary.alignment}>
                <PrismicRichText field={slice.primary.content} />
            </SliceContent>
        </Container>
    );
};

export default Title;
