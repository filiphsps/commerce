import type { CSSProperties, ElementType, HTMLProps, ReactNode } from 'react';

import styles from '@/components/typography/heading.module.scss';

export type TitleProps = {
    children?: ReactNode;
    as?: ElementType;
    bold?: boolean;
} & HTMLProps<HTMLDivElement>;
export const Title = ({ as, bold, className, ...props }: TitleProps) => {
    const AsComponent = as || ('h1' as keyof JSX.IntrinsicElements);
    return <AsComponent {...props} className={`${styles.title} ${(bold && styles.bold) || ''} ${className || ''}`} />;
};

export type SubTitleProps = {
    children?: ReactNode;
    as?: ElementType;
    bold?: boolean;
} & HTMLProps<HTMLDivElement>;
export const SubTitle = ({ as, bold, className, ...props }: SubTitleProps) => {
    const fallback: keyof JSX.IntrinsicElements = 'div';
    const AsComponent = as || fallback;

    return (
        <AsComponent {...props} className={`${styles.subtitle} ${(bold && styles.bold) || ''} ${className || ''}`} />
    );
};

type HeadingProps = {
    title: ReactNode;
    subtitle: ReactNode;
    reverse?: boolean;
    bold?: boolean;
    titleAs?: ElementType;
    titleStyle?: CSSProperties;
    titleClassName?: string;
    subtitleAs?: ElementType;
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
    subtitleAs,
    subtitleStyle,
    subtitleClassName
}: HeadingProps) => {
    const titleComponent = (
        <Title bold={bold} as={titleAs as any} style={titleStyle} className={titleClassName}>
            {title}
        </Title>
    );
    const subtitleComponent = (
        <SubTitle bold={bold} as={subtitleAs as any} style={subtitleStyle} className={subtitleClassName}>
            {subtitle}
        </SubTitle>
    );

    return (
        <>
            {!reverse ? titleComponent : subtitleComponent}
            {reverse ? titleComponent : subtitleComponent}
        </>
    );
};

export default Heading;
