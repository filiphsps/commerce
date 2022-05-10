import React, { FunctionComponent, memo } from 'react';

const Input = (props: any) => {
    return <input {...props} className="Input" />;
};

export default memo(Input);
