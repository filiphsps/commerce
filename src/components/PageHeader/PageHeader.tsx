import React, { FunctionComponent, memo } from 'react';

import styled from 'styled-components';

const Wrapper = styled.div`
    margin-bottom: 1rem;
`;

const Content = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    text-transform: uppercase;
    font-weight: 700;
    font-size: 1.75rem;
    line-height: 2rem;
    color: #404756;
    padding-bottom: 0.25rem;
`;

const Action = styled.div`
    font-size: 1.15rem;
    cursor: pointer;

    &:hover {
        color: var(--accent-primary);
    }
`;

const Description = styled.div`
    color: #404756;
    font-size: 1.25rem;
    font-weight: 700;
    text-transform: uppercase;
`;

interface PageHeaderProps {
    title?: any;
    description?: any;
    action?: any;
}
const PageHeader: FunctionComponent<PageHeaderProps> = (props) => {
    return (
        <Wrapper>
            <Content>
                {props?.title}
                <Action>{props?.action}</Action>
            </Content>
            <Description>{props?.description}</Description>
        </Wrapper>
    );
};

export default memo(PageHeader);
