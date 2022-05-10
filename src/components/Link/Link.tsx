import NextLink from 'next/link';
import React from 'react';

const Link = (props) => {
    return (
        <NextLink
            href={props.as || props.to}
            as={props.as ? props.to : undefined}
            locale={props.locale}
        >
            <a
                {...props}
                className={`Link ${props.className}`}
                style={props.style}
            >
                {props.children}
            </a>
        </NextLink>
    );
};

Link.defaultProps = {
    to: '',
    className: ''
};

export default Link;
