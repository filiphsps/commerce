import styled from 'styled-components';

export const Button = styled.button`
    appearance: none;
    display: block;
    width: 100%;
    padding: var(--block-padding) var(--block-padding-large);
    line-height: 1.25rem;
    font-size: 1.25rem;
    font-weight: 500;
    text-align: center;
    user-select: none;
    transition: 250ms all ease-in-out;
    border-radius: var(--block-border-radius);

    background-color: var(--accent-primary);
    color: var(--accent-primary-text);
    cursor: pointer;

    @media (max-width: 950px) {
        font-size: 1.5rem;
    }

    &:hover {
        background: var(--accent-primary-light);
    }

    &:active,
    &:focus {
        background: var(--accent-primary-dark);
    }

    &.Secondary {
        padding: var(--block-padding) var(--block-padding-large);
        background: unset;
        border: var(--block-border-width) solid var(--accent-primary);
        color: var(--accent-primary);
        font-weight: 800;

        &:hover {
            background: var(--accent-primary);
            border-color: var(--accent-primary);
            color: var(--accent-primary-text);
        }
        &:active {
            color: var(--accent-primary);
            background: var(--accent-primary-text);
            border-color: var(--accent-primary-text);
        }
    }

    &:disabled,
    &[disabled] {
        background: var(--color-block) !important;
        color: var(--color-gray) !important;

        cursor: not-allowed;
        opacity: 0.75;
    }
`;
