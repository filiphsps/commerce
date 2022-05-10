import React, { FunctionComponent, memo } from 'react';

import { FiX } from 'react-icons/fi';

interface CheckboxProps {
    checked?: boolean;
    onClick?: any;
}
const Checkbox: FunctionComponent<CheckboxProps> = (props) => {
    return (
        <div className="Checkbox" onClick={props.onClick}>
            {props.checked && <FiX />}
        </div>
    );
};

export default memo(Checkbox);
