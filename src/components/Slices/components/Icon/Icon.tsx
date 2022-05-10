import React, { FunctionComponent, memo } from 'react';

interface IconProps {
    data?: {
        src?: string;
    };
}
const Icon: FunctionComponent<IconProps> = (props) => {
    return <img className="Slice Slice-Icon" src={props?.data?.src} />;
};

export default memo(Icon);
