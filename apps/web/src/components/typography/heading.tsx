import type { CSSProperties, ComponentProps, ElementType, HTMLProps, ReactNode } from 'react';

import styles from '@/components/typography/heading.module.scss';
import type { As } from '@nordcom/nordstar';

export type TitleProps<T extends As> = {
    as?: As;
    children?: ReactNode;
    bold?: boolean;
} & ComponentProps<T>;
export const Title = <T extends As = ElementType<'h1'>>({ as, bold, className, ...props }: TitleProps<T>) => {
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
    subtitle?: ReactNode;
    reverse?: boolean;
    bold?: boolean;
    titleAs?: ElementType;
    titleStyle?: CSSProperties;
    titleClassName?: string;
    titleProps?: ComponentProps<any>;
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
