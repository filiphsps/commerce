import styled from 'styled-components';

const Content = styled.div`
    max-width: 100%;
    height: 100%;
    font-size: 1.75rem;
    line-height: 2rem;

    a {
        color: var(--accent-primary);
        border-bottom: 0.2rem dotted var(--accent-primary);

        &:hover {
            color: var(--accent-primary-light);
            border-bottom-color: var(--accent-primary-light);
        }
    }

    p {
        margin-bottom: 1.5rem;
        font-size: 1.75rem;
        line-height: 2.25rem;

        &:last-child {
            margin-bottom: 0px;
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
        line-height: 3.25rem;
        font-weight: 600;
        padding-bottom: 1.5rem;
    }
    h2 {
        font-size: 2.75rem;
        line-height: 3rem;
        font-weight: 600;
        padding-bottom: 1rem;
    }
    h3 {
        font-size: 2rem;
        line-height: 3.25rem;
        font-weight: 500;
        padding-bottom: 1rem;
    }

    img {
        width: 100%;
        max-width: 100% !important;
        object-fit: contain;
        margin-bottom: 1rem;
    }
`;

export default Content;
