'use client';

import { Content, asLink } from '@prismicio/client';
import styled, { css } from 'styled-components';

import Link from '@/components/link';
import { PrismicRichText } from '@prismicio/react';
import type { SliceComponentProps } from '@prismicio/react';
import color from 'color';

const Contents = styled.div`
    display: grid;
    justify-content: center;
    align-items: center;
    grid-template-rows: 1fr;
    gap: var(--block-padding-large);
    padding: calc(var(--block-padding-large) * 2) var(--block-padding-large);
    min-height: 30vh;
    max-width: 1465px;

    @media (min-width: 950px) {
        gap: calc(var(--block-padding-large) * 2);
    }

    @media (min-width: 1465px) {
        padding: 4rem 10rem;
    }
`;

const Header = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    text-align: center;

    p {
        padding-top: var(--block-padding-large);
        font-size: 2rem;
        line-height: 2.5rem;
        font-weight: 400;

        @media (min-width: 950px) {
            font-size: 2.5rem;
            line-height: 3rem;
        }
    }

    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
        color: var(--heading-color);
        font-size: 2.75rem;
        line-height: 3.25rem;
        font-weight: 500;

        @media (min-width: 950px) {
            font-size: 3rem;
            line-height: 3.5rem;
        }

        strong,
        a {
            font-weight: inherit;
            color: var(--heading-selected-color);
        }
    }
`;

const Action = styled(Link)<{ $primary?: boolean }>`
    padding: var(--block-padding) calc(var(--block-padding-large) * 1.75);
    border-radius: calc(var(--block-border-radius-large) * 2);
    border: var(--block-border-width) solid var(--heading-selected-color);
    color: var(--heading-selected-color);
    font-weight: 500;
    font-size: 1.5rem;
    line-height: 1.75rem;
    text-align: center;
    transition: 250ms ease-in-out;
    user-select: none;

    @media (min-width: 950px) {
        padding: var(--block-padding-large) calc(var(--block-padding-large) * 4);
        font-size: 1.75rem;
        line-height: 2rem;
    }

    ${({ $primary }) =>
        $primary &&
        css`
            background: var(--heading-selected-color);
            color: var(--accent-primary-text);
            font-weight: 700;
        `}

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            border-color: var(--accent-secondary-light);
            background: var(--accent-secondary-light);
            color: var(--accent-secondary-text);
        }
    }
`;

const ActionBar = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--block-padding-large);

    &:empty {
        display: none;
    }

    @media (min-width: 950px) {
        gap: calc(var(--block-padding-large) * 2);
    }
`;

const Container = styled.section<{ $background: string; $fullWidth?: boolean; $slim?: boolean }>`
    display: grid;
    justify-content: center;
    align-items: center;

    background: var(--background);
    color: var(--content-color);
    border-radius: var(--block-border-radius-large);

    ${({ $fullWidth }) =>
        $fullWidth &&
        css`
            position: relative;
            width: calc(100vw - var(--block-padding-large) / 2);
            margin-left: -50vw;
            left: 50%;
        `};

    ${({ $slim }) =>
        $slim &&
        css`
            ${Contents} {
                min-height: unset;

                ${Header} {
                    p {
                        padding-top: 0;
                        font-size: 1.75rem;
                        line-height: 2.25rem;

                        @media (min-width: 950px) {
                            font-size: 2rem;
                            line-height: 2.5rem;
                        }
                    }

                    h1,
                    h2,
                    h3,
                    h4,
                    h5,
                    h6 {
                        font-size: 2.5rem;
                        line-height: 3rem;

                        @media (min-width: 950px) {
                            font-size: 3rem;
                            line-height: 3.5rem;
                        }
                    }
                }

                ${Action} {
                    font-size: 1.25rem;
                    line-height: 1.25rem;
                    padding: var(--block-padding) var(--block-padding-large);

                    @media (min-width: 950px) {
                        padding: calc(var(--block-padding) * 1.25) calc(var(--block-padding-large) * 2);
                        font-size: 1.5rem;
                        line-height: 1.5rem;
                    }
                }

                gap: calc(var(--block-padding-large) * 1.5);

                @media (min-width: 950px) {
                    gap: var(--block-padding-large);
                }
                @media (min-width: 1465px) {
                    padding: calc(var(--block-padding-large) * 1.5) var(--block-padding-large);
                }
            }
        `};

    --background: ${({ $background }) => $background};

    --mixer-color: ${({ $background }) =>
        (color($background).luminosity() > 0.35 && 'var(--color-dark)') || 'var(--color-bright)'};
    --heading-color: color-mix(in srgb, var(--background) 10%, var(--mixer-color));
    --heading-selected-color: color-mix(in srgb, var(--accent-primary) 85%, var(--mixer-color));
    --content-color: color-mix(in srgb, var(--background) 30%, var(--mixer-color));
`;

/**
 * Props for `Banner`.
 */
export type BannerProps = SliceComponentProps<Content.BannerSlice>;

/**
 * Component for "Banner" Slices.
 */
const Banner = ({ slice }: BannerProps): JSX.Element => {
    // TODO: Handle other variations
    return (
        <Container
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
            className={slice.variation}
            $slim={slice.variation.toLowerCase().includes('slim')}
            $background={slice.primary.background || '#cce2cb'}
        >
            <Contents>
                <Header>
                    <PrismicRichText field={slice.primary.content} />
                </Header>
                <ActionBar>
                    {slice.items.map((cta, index) => (
                        <Action
                            key={index}
                            $primary={cta.type}
                            href={((cta.target && asLink(cta.target)?.toString()!) || {})!}
                        >
                            <PrismicRichText field={cta.title} />
                        </Action>
                    ))}
                </ActionBar>
            </Contents>
        </Container>
    );
};

export default Banner;
