import React, { FunctionComponent } from 'react';

import NextLink from 'next/link';
import { useRouter } from 'next/router';

interface LinkProps {
    as?: string,
    to?: string,
    locale?: any,
    style?: any,
    className?: string,
    children?: any,

    itemType?: any,
    itemProp?: any
}
const Link: FunctionComponent<LinkProps> = (props) => {
    const router = useRouter();

    return (
        <NextLink
            href={props.as || props.to}
            as={props.as ? props.to : undefined}
            locale={props.locale ? props.locale : router.locale}
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
