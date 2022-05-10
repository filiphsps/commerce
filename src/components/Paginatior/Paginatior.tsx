import React, { FunctionComponent, memo } from 'react';

interface PaginatiorProps {
    step: number;
    size: number;
    stepSize?: number;

    onChange?: any;
}
const Paginatior: FunctionComponent<PaginatiorProps> = (props) => {
    const steps = [];
    for (let i = 0; i < Math.ceil(props.size / (props.stepSize || 52)); i++) {
        steps.push(
            <div
                key={i}
                className={`Paginatior-Content-Step ${
                    i === props.step && 'Paginatior-Content-Step-Selected'
                }`}
                onClick={() => {
                    props.onChange(i);
                }}
            >
                {i + 1}
            </div>
        );
    }
    return (
        <div className="Paginatior">
            <div className="Paginatior-Content">{steps}</div>
        </div>
    );
};

export default memo(Paginatior);
