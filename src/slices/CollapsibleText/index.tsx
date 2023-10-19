'use client';

import { Content } from '@prismicio/client';

import PageContent from '@/components/PageContent';
import { Overview } from '@/components/typography/Overview';
import { PrismicRichText, SliceComponentProps } from '@prismicio/react';
import Color from 'color';
import { FiChevronUp } from 'react-icons/fi';
import styled from 'styled-components';

const Container = styled.section`
    width: 100%;
    padding: 0;
    margin: 0;
`;

const Content = styled.div`
    color: var(--foreground);
    padding: var(--block-padding-large);
    background: var(--color-block);
    border-radius: var(--block-border-radius);
    background: linear-gradient(320deg, var(--background) 0%, var(--background-dark) 100%);
`;

const Summary = styled.summary`
    display: flex;
    gap: var(--block-spacer);
    justify-self: flex-start;
    align-items: center;
    font-size: 2rem;
    line-height: 2.5rem;
    font-weight: 700;
    cursor: pointer;
    user-select: none;
    transition: 250ms all ease-in-out;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            border-color: var(--accent-primary);
            color: var(--accent-primary);

            .Icon {
                color: var(--accent-primary);
            }
        }
    }

    .Icon {
        width: 2rem;
        font-size: 2rem;
        line-height: 2rem;
        transition: 250ms ease-in-out;
    }
`;
const Details = styled.details`
    transition: 250ms ease-in-out;
    font-size: 1.5rem;
    line-height: 1.75rem;
    font-weight: 500;

    &[open] ${Summary} {
        margin-bottom: 1rem;

        .Icon {
            rotate: 180deg;
        }
    }
`;

/**
 * Props for `CollapsibleText`.
 */
export type CollapsibleTextProps = SliceComponentProps<Content.CollapsibleTextSlice>;

/**
 * Component for "CollapsibleText" Slices.
 */
const CollapsibleText = ({ slice }: CollapsibleTextProps): JSX.Element => {
    return (
        <Container
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
            style={
                {
                    '--background': slice.primary.accent || 'var(--color-block)',
                    '--background-dark': slice.primary.accent_dark || 'var(--color-block)',
                    '--foreground':
                        (slice.primary.accent && Color(slice.primary.accent).isDark() && 'var(--color-text-primary)') ||
                        'var(--color-dark)'
                } as React.CSSProperties
            }
        >
            <PageContent>
                <Content>
                    <Details className={`Slice-Collapse-Body`}>
                        <Summary>
                            <FiChevronUp className="Icon" /> {slice?.primary?.title}
                        </Summary>

                        <Overview body={<PrismicRichText field={slice?.primary?.text} />} />
                    </Details>
                </Content>
            </PageContent>
        </Container>
    );
};

export default CollapsibleText;
