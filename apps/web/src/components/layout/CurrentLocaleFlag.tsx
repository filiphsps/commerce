'use client';

import type { Locale } from '@/utils/locale';
import Image from 'next/image';
import styled from 'styled-components';

/* c8 ignore start */
const Container = styled.div`
    overflow: hidden;
    position: relative;
    height: 2.5rem;
    width: auto;
    aspect-ratio: 3 / 2;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
    }
`;

export type CurrentLocaleFlagProps = {
    locale: Locale;
};
export const CurrentLocaleFlag = ({ locale }: CurrentLocaleFlagProps) => {
    return (
        <Container>
            <Image
                src={`https://purecatamphetamine.github.io/country-flag-icons/3x2/${locale.country}.svg`}
                alt={locale.locale}
                width="25"
                height="25"
                aria-label={locale.locale}
                priority
            />
        </Container>
    );
};
/* c8 ignore stop */
