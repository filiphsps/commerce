'Use client';

import type { FunctionComponent } from 'react';
import styled from 'styled-components';

const Metronome = styled.div<{ $dark?: boolean; $speed?: number }>`
    --size: 6rem;
    --speed: ${({ $speed }) => $speed || 1.5}s;
    --accent: ${({ $dark }) => ($dark && 'var(--accent-secondary-dark)') || 'var(--accent-secondary-light)'};

    position: relative;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    height: var(--size);
    width: var(--size);

    @keyframes swing {
        0% {
            transform: rotate(0deg);
        }

        15% {
            transform: rotate(0deg);
        }

        50% {
            transform: rotate(180deg);
        }

        65% {
            transform: rotate(180deg);
        }

        100% {
            transform: rotate(0deg);
        }
    }
`;

const Dot = styled.div`
    position: absolute;
    top: 13.5%;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    height: 100%;
    width: 100%;
    animation: swing var(--speed) cubic-bezier(0.45, 0, 0.55, 1) infinite;

    &::before {
        content: '';
        height: 25%;
        width: 25%;
        border-radius: 50%;
        background-color: var(--accent);
    }

    &:nth-child(1) {
        animation-delay: calc(var(--speed) * -0.36);
    }

    &:nth-child(2) {
        animation-delay: calc(var(--speed) * -0.27);
        opacity: 0.8;

        &::before {
            transform: scale(0.9);
        }
    }

    &:nth-child(3) {
        animation-delay: calc(var(--speed) * -0.18);
        opacity: 0.6;
        &::before {
            transform: scale(0.8);
        }
    }

    &:nth-child(4) {
        animation-delay: calc(var(--speed) * -0.09);
        opacity: 0.4;
        &::before {
            transform: scale(0.7);
        }
    }
`;

interface LoaderProps {
    light?: boolean;
}
const Loader: FunctionComponent<LoaderProps> = ({ light }) => {
    return (
        <Metronome $speed={1.75} $dark={!light}>
            <Dot />
            <Dot />
            <Dot />
            <Dot />
        </Metronome>
    );
};

export default Loader;
