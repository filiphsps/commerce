import React, { FunctionComponent, memo } from 'react';

interface NotificationHeaderProps {
    body: string;
}
const NotificationHeader: FunctionComponent<NotificationHeaderProps> = (
    props
) => {
    return (
        <div className="NotificationHeader">
            <div className="NotificationHeader-Content">{props.body}</div>
        </div>
    );
};

export default memo(NotificationHeader);
