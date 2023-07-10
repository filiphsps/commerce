import React, { FunctionComponent } from 'react';

import styled from 'styled-components';

const Container = styled.main``;

interface PageProps {
    className?: string;
    children: any;
    style?: any;
}
const Page: FunctionComponent<PageProps> = (props) => {
    return (
        <Container className={`Page ${props.className || ''}`} style={props.style}>
            {props.children}
        </Container>
    );
};

export default Page;
