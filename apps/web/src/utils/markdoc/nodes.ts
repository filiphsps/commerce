import { Tag } from '@markdoc/markdoc';
import { Card, Heading } from '@nordcom/nordstar';
import Link from 'next/link';

export const link = {
    render: Link,
    attributes: {
        href: {
            type: String
        }
    }
};

export const fence = {
    render: Card,
    attributes: {
        content: {
            type: String
        },
        'data-language': {
            type: String
        }
    }
};

export const heading = {
    render: Heading,
    children: ['inline'],
    attributes: {
        id: { type: String },
        level: { type: Number, required: true, default: 1 },
        className: { type: String }
    },
    transform(node: any, config: any) {
        const { level, ...attributes } = node.transformAttributes(config);
        const children = node.transformChildren(config);

        return new Tag(this.render as any, { ...attributes, level: `h${level}` }, children);
    }
};
