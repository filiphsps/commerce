import React, { FunctionComponent, memo } from 'react';

interface IconProps {
    src: string;

    onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}
const Icon: FunctionComponent<IconProps> = (props) => {
    return (
        <i
            className={`Icon icon ion-${props.src} ion-ios-${props.src}`}
            onClick={props.onClick}
        />
    );
};

export default memo(Icon);
