import React, { FunctionComponent, memo } from 'react';

import PageContent from '../../../PageContent';
import styled from 'styled-components';

const Content = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 1.25rem;
    margin-bottom: 1rem;
    background: var(--accent-secondary-dark);
    color: var(--color-text-primary);
    text-transform: uppercase;
    text-align: center;
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: 0.05rem;
`;

interface NotificationProps {
    data: {
        primary: {
            content: string;
        };
    };
}
const Notification: FunctionComponent<NotificationProps> = (props) => {
    return (
        <div className="Slice Slice-Notification">
            <PageContent>
                <Content>{props.data.primary.content}</Content>
            </PageContent>
        </div>
    );
};

export default memo(Notification);
