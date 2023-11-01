'use client';

import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';
import styled from 'styled-components';

const Container = styled.section`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(24rem, 1fr));
    gap: var(--block-spacer);
    width: 100%;
`;

const Custom = styled.div<{ scaling?: number }>`
    height: calc(var(--block-spacer) * ${({ scaling }) => scaling || 2});
`;

const Large = styled.div`
    height: calc(var(--block-spacer) * 4);
`;
const Normal = styled.div`
    height: calc(var(--block-spacer) * 2);
`;
const Small = styled.div`
    height: calc(var(--block-spacer) * 1);
`;

/**
 * Props for `Spacing`.
 */
export type SpacingProps = SliceComponentProps<Content.SpacingSlice>;

/**
 * Component for "Spacing" Slices.
 */
const Spacing = ({ slice }: SpacingProps): JSX.Element => {
    return (
        <Container data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
            {((slice) => {
                switch (slice.variation) {
                    case 'custom':
                        return <Custom scaling={slice.primary.scaling || undefined} />;
                    case 'small':
                        return <Small />;
                    case 'large':
                        return <Large />;
                    default:
                    case 'normal':
                        return <Normal />;
                    // TODO: maybe we should throw on default?
                    // or maybe not to handle old deployments?
                }
            })(slice)}
        </Container>
    );
};

export default Spacing;
