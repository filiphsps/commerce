import styled from 'styled-components';

export const BadgeContainer = styled.div`
    display: flex;
    gap: var(--block-spacer);
    flex-wrap: wrap;
    justify-content: stretch;
    align-items: stretch;
    max-width: 100%;
`;
export const Badge = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: auto;
    padding: var(--block-padding-small) var(--block-padding);
    border-radius: var(--block-padding-large);
    background: var(--color-block);
    color: var(--color-dark);
    font-size: 1.25rem;
    line-height: 1.5rem;
    font-weight: 600;

    &.Vegan {
        background: var(--color-green);
        color: var(--color-bright);
    }

    a {
        color: inherit;
    }
`;
