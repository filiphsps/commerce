import type { FunctionComponent } from 'react';
import Image from 'next/image';
import styled from 'styled-components';
import { usePathname } from 'next/navigation';

const Container = styled.div`
    overflow: hidden;
    position: relative;
    width: 3.25rem;
    height: 3.25rem;
    border-radius: 100%;
    border: calc(var(--block-border-width) / 1.25) solid var(--accent-secondary-text);

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            border-color: var(--accent-primary);
        }
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
