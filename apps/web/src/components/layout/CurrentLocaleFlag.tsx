'use client';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import type { FunctionComponent } from 'react';
import styled from 'styled-components';

const Container = styled.div`
    overflow: hidden;
    position: relative;
    height: 2.5rem;
    aspect-ratio: 3 / 2;
    border: var(--block-border-width-small) solid var(--accent-secondary-text);

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
    }
`;

interface CurrentLocaleFlagProps {}
export const CurrentLocaleFlag: FunctionComponent<CurrentLocaleFlagProps> = ({}) => {
    const route = usePathname();

    if (!route) return null;
    const locale = route.split('/').at(1); // FIXME: Handle this properly.

    if (!locale || locale === 'x-default') return null;

    return (
        <Container>
            <Image
                src={`https://purecatamphetamine.github.io/country-flag-icons/3x2/${locale.split('-').at(-1)}.svg`}
                alt={locale}
                width="25"
                height="25"
                aria-label={locale}
                priority
            />
        </Container>
    );
};
