import React, { FunctionComponent, memo } from 'react';

interface ModalProps {
    className?: string;
    header?: any;

    children?: any;
    close?: any;
}
const Modal: FunctionComponent<ModalProps> = (props) => {
    return (
        <div className={`Modal ${props.className}`}>
            <div className="Modal-Background" onClick={props.close}></div>
            <div className="Modal-Block">
                <div className="Modal-Block-Content">
                    <div className="Modal-Block-Header">{props.header}</div>
                    {props.children}
                </div>
            </div>
        </div>
    );
};

export default memo(Modal);
