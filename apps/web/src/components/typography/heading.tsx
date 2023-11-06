import type { HTMLProps, ReactNode } from 'react';

import styles from '@/components/typography/heading.module.css';

type TitleProps = {
    children?: ReactNode;
} & HTMLProps<HTMLDivElement>;
export const Title = ({ children }: TitleProps) => {
    return <div className={styles.title}>{children}</div>;
};

type SubTitleProps = {
    children?: ReactNode;
} & HTMLProps<HTMLDivElement>;
export const SubTitle = ({ children }: SubTitleProps) => {
    return <div className={styles.subtitle}>{children}</div>;
};

type HeadingProps = {
    title: ReactNode;
    subtitle: ReactNode;
    reverse?: boolean;
    bold?: boolean;
};
const Heading = ({ title, subtitle, reverse, bold }: HeadingProps) => {
    const titleComponent = <Title>{title}</Title>;
    const subtitleComponent = <SubTitle>{subtitle}</SubTitle>;

    return (
        <div className={`${styles.container} ${(bold && styles.bold) || ''}`}>
            {!reverse ? titleComponent : subtitleComponent}
            {reverse ? titleComponent : subtitleComponent}
        </div>
    );
};

export default Heading;
