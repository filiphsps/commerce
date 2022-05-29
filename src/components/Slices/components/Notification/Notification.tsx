import React, { FunctionComponent, memo } from 'react';

import PageContent from '../../../PageContent';
import styled from 'styled-components';

const Content = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 4rem;
    padding: 1rem;
    margin-bottom: 1rem;
    background: var(--accent-primary);
    color: var(--color-text-primary);
    text-transform: uppercase;
    font-size: 1.5rem;
    font-weight: 800;
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
        <div className="Slice Slice-Vendors">
            <PageContent>
                <Content>{props.data.primary.content}</Content>
            </PageContent>
        </div>
    );
};

export default memo(Notification);
