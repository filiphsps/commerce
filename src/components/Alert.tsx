import Content from './Content';
import { FunctionComponent } from 'react';
import { PiInfoBold } from 'react-icons/pi';
import styled from 'styled-components';

const Container = styled.section`
    display: grid;
    grid-template-columns: 4rem 1fr;
    grid-template-rows: 1fr;
    gap: var(--block-padding-large);
    width: auto;
    padding: var(--block-padding-large);
    border-radius: var(--block-border-radius-large);
    background: var(--color-block-pastel-lime);

    @media (min-width: 950px) {
        grid-template-columns: auto auto;
        justify-content: center;
        align-items: center;
        width: 100%;
        width: fit-content;
    }
`;
const Body = styled(Content)`
    display: flex;
    justify-content: start;
    align-items: center;
    font-size: 1.5rem;
    line-height: 1.75rem;
    color: var(--color);

    a {
        color: var(--color);

        text-decoration: underline;
        text-decoration-style: dotted;
        text-decoration-thickness: 0.2rem;
        text-underline-offset: var(--block-border-width);
    }

    @media (min-width: 950px) {
        align-items: center;
    }
`;
const Icon = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    color: var(--color);
    font-size: 3.75rem;
    text-align: center;
`;

interface AlertProps {
    severity: 'success' | 'info' | 'warning' | 'error';
    children: React.ReactNode;
}
// FIXME: Actually respect `severity`
export const Alert: FunctionComponent<AlertProps> = ({ children }) => {
    return (
        <Container
            style={
                {
                    '--color': 'var(--color-block-pastel-lime-dark)'
                } as React.CSSProperties
            }
        >
            <Icon>
                <PiInfoBold />
            </Icon>
            <Body>{children}</Body>
        </Container>
    );
};
