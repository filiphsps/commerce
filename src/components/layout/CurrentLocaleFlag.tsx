import type { FunctionComponent } from 'react';
import Image from 'next/image';
import styled from 'styled-components';
import { useRouter } from 'next/router';

const Container = styled.div`
    overflow: hidden;
    position: relative;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 100%;
    border: calc(var(--block-border-width) / 1.5) solid var(--accent-secondary-text);

    &:hover {
        border-color: var(--accent-primary);
    }

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
    }
`;

interface CurrentLocaleFlagProps {}
export const CurrentLocaleFlag: FunctionComponent<CurrentLocaleFlagProps> = ({}) => {
    const { locale } = useRouter();

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
