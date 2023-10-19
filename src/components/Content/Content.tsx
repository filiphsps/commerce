import styled from 'styled-components';

const Content = styled.div`
    max-width: 100%;
    height: auto;
    font-size: 1.75rem;
    font-weight: 400;
    line-height: 2rem;

    a {
        color: var(--accent-primary-dark);
        font-weight: 600;

        @media (hover: hover) and (pointer: fine) {
            &:hover {
                color: var(--accent-primary);
                border-bottom-color: var(--accent-primary);
            }
        }
    }

    p {
        margin-bottom: 1.5rem;
        font-size: 1.75rem;
        line-height: 2.25rem;

        &:last-child {
            margin-bottom: 0;
        }

        i,
        em {
            font-weight: 700;
        }
    }

    ul {
        padding-left: 1rem;
        font-size: 1.75rem;
        margin-bottom: 1.5rem;
        opacity: 0.85;

        li {
            margin-bottom: 0.5rem;
            &::before {
                content: '• ';
            }
        }
    }

    h1 {
        font-size: 3rem;
        line-height: 3.5rem;
        font-weight: 600;
        padding-bottom: 1.5rem;

        &:last-child {
            padding-bottom: 0;
        }
    }
    h2 {
        font-size: 2.75rem;
        line-height: 3.25rem;
        font-weight: 600;
        padding-bottom: 1rem;

        &:last-child {
            padding-bottom: 0;
        }
    }
    h3 {
        font-size: 2.25rem;
        line-height: 2.75rem;
        font-weight: 500;
        padding-bottom: 1rem;

        &:last-child {
            padding-bottom: 0;
        }
    }

    img {
        width: 100%;
        max-width: 100% !important;
        object-fit: contain;
        margin-bottom: 1rem;
    }
`;

export default Content;
