import { PrismicRichText, SliceComponentProps } from '@prismicio/react';

import { Content } from '@prismicio/client';
import { Overview } from '@/components/typography/Overview';
import PageContent from '@/components/PageContent';
import { styled } from '@linaria/react';

const Container = styled.section`
    width: 100%;
    padding: 0px;
    margin: 0px;
`;
const Components = styled(PageContent)`
    gap: var(--block-spacer-large);
`;

/**
 * Props for `Overview`.
 */
export type OverviewProps = SliceComponentProps<Content.TextBlockSlice>;

/**
 * Component for "Overview" Slices.
 */
const OverviewSlice = ({ slice }: OverviewProps): JSX.Element => {
    return (
        <Container data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
            <Components>
                {slice?.items?.map((item, index) => {
                    return (
                        <Overview
                            key={index}
                            style={
                                (item.accent &&
                                    ({
                                        '--accent-primary': item.accent,
                                        '--accent-primary-light':
                                            'color-mix(in srgb, var(--accent-primary) 65%, var(--color-bright))',
                                        '--accent-primary-dark':
                                            'color-mix(in srgb, var(--accent-primary) 65%, var(--color-dark))'
                                    } as React.CSSProperties)) ||
                                undefined
                            }
                            layout={item.layout}
                            image={(item.image?.url && (item.image as any)) || undefined}
                            imageStyle={item.image_style}
                            body={<PrismicRichText field={item.text} />}
                        />
                    );
                })}
            </Components>
        </Container>
    );
};

export default OverviewSlice;
