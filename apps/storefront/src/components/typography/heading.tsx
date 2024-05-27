import styles from '@/components/typography/heading.module.scss';

import { Fragment } from 'react';

import type { As } from '@nordcom/nordstar';

import type { ComponentProps, CSSProperties, HTMLProps, ReactNode } from 'react';

export type TitleProps<T extends As> = {
    as?: As;
    children?: ReactNode;
    bold?: boolean;
} & ComponentProps<T>;
export const Title = <T extends As>({ as: Tag = 'h1' as T, bold, className, key, ...props }: TitleProps<T>) => {
    if (!props.children) return null;
    if (Tag === null) {
        return <Fragment key={key} children={props.children} />;
    }

    const AsComponent = Tag || ('h1' as keyof JSX.IntrinsicElements);
    return (
        <AsComponent
            key={key}
            {...props}
            className={`${styles.title} ${(bold && styles.bold) || ''} ${className || ''}`}
        />
    );
};

export type SubTitleProps = {
    children?: ReactNode;
    as?: As | null;
    bold?: boolean;
} & HTMLProps<HTMLDivElement>;
export const SubTitle = ({ as, bold, className, key, ...props }: SubTitleProps) => {
    if (as === null) {
        return <Fragment key={key} children={props.children} />;
    }

    const fallback: keyof JSX.IntrinsicElements = 'div';
    const AsComponent = as || fallback;

    return (
        <AsComponent
            key={key}
            {...props}
            className={`${styles.subtitle} ${(bold && styles.bold) || ''} ${className || ''}`}
        />
    );
};

type HeadingProps = {
    title: ReactNode;
    subtitle?: ReactNode;
    reverse?: boolean;
    bold?: boolean;
    titleAs?: As | null;
    titleStyle?: CSSProperties;
    titleClassName?: string;
    titleProps?: ComponentProps<any>;
    subtitleAs?: As | null;
    subtitleStyle?: CSSProperties;
    subtitleClassName?: string;
};
const Heading = ({
    title,
    subtitle,
    reverse,
    bold,
    titleAs,
    titleStyle,
    titleClassName,
    titleProps,
    subtitleAs,
    subtitleStyle,
    subtitleClassName
}: HeadingProps) => {
    const titleComponent = (
        <Title bold={bold} as={titleAs as any} style={titleStyle} className={titleClassName} {...(titleProps || {})}>
            {title}
        </Title>
    );

    const subtitleComponent = subtitle ? (
        <SubTitle bold={bold} as={subtitleAs as any} style={subtitleStyle} className={subtitleClassName}>
            {subtitle}
        </SubTitle>
    ) : null;

    return (
        <>
            {!reverse ? titleComponent : subtitleComponent}
            {reverse ? titleComponent : subtitleComponent}
        </>
    );
};

export default Heading;
