import styled from 'styled-components';

const Content = styled.div`
    a {
        color: var(--accent-primary);

        &:hover {
            color: var(--accent-primary-light);
            text-decoration: underline;
        }
    }

    p {
        margin-bottom: 1.5rem;
        font-size: 1.75rem;
        line-height: 2.25rem;
        color: #404756;

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
        color: #404756;

        li {
            margin-bottom: 0.5rem;
            &::before {
                content: '• ';
            }
        }
    }

    h1 {
        margin-bottom: 0.5rem;
        font-size: 3.25rem;
        line-height: 3.5rem;
        font-weight: 700;
        text-transform: uppercase;
    }
    h2 {
        margin-bottom: 0.5rem;
        font-size: 2.75rem;
        line-height: 3rem;
        font-weight: 700;
        text-transform: uppercase;
    }
    h3 {
        margin-bottom: 0.5rem;
        font-size: 2rem;
        line-height: 3.25rem;
        font-weight: 600;
        text-transform: uppercase;
    }

    img {
        width: 100%;
        max-width: 100% !important;
        object-fit: contain;
        mix-blend-mode: multiply;
        margin-bottom: 1rem;
    }
`;

export default Content;
