import React, { FunctionComponent, memo } from 'react';

import styled from 'styled-components';

const Wrapper = styled.div`
    margin-bottom: 1rem;
`;

// TODO: replace this with generic header component(s).
const Title = styled.h2`
    margin: 0px 0px 0.75rem -0.05rem;
    text-transform: uppercase;
    font-weight: 700;
    font-size: 3rem;
    color: var(--accent-primary);
`;
const SubTitle = styled.h3`
    color: #404756;
    text-transform: uppercase;
    font-weight: 600;
    font-size: 1.75rem;
    margin-left: 0.05rem;

    cursor: pointer;

    &:hover,
    :focus {
        color: var(--accent-primary-dark);
    }
`;

interface PageHeaderProps {
    title: string | JSX.Element;
    subtitle?: string | JSX.Element;
    reverse?: boolean;
}
const PageHeader: FunctionComponent<PageHeaderProps> = ({
    title,
    subtitle,
    reverse
}) => {
    let Primary = Title;
    let Secondary = SubTitle;

    if (reverse) {
        Primary = SubTitle;
        Secondary = Title;
    }

    return (
        <Wrapper>
            <Primary>{title}</Primary>
            <Secondary>{subtitle}</Secondary>
        </Wrapper>
    );
};

export default memo(PageHeader);
