import type { HTMLProps, ReactNode } from 'react';

import { RemoveInvalidProps } from '@/utils/remove-invalid-props';
import styles from '@/components/typography/heading.module.scss';

type TitleProps = {
    children?: ReactNode;
    bold?: boolean;
} & HTMLProps<HTMLDivElement>;
export const Title = (props: TitleProps) => {
    return (
        <div
            {...RemoveInvalidProps(props)}
            className={`${styles.title} ${(props.bold && styles.bold) || ''} ${props.className || ''}`}
        />
    );
};

type SubTitleProps = {
    children?: ReactNode;
    bold?: boolean;
} & HTMLProps<HTMLDivElement>;
export const SubTitle = (props: SubTitleProps) => {
    return (
        <div
            {...RemoveInvalidProps(props)}
            className={`${styles.subtitle} ${(props.bold && styles.bold) || ''} ${props.className || ''}`}
        />
    );
};

type HeadingProps = {
    title: ReactNode;
    subtitle: ReactNode;
    reverse?: boolean;
    bold?: boolean;
};
const Heading = ({ title, subtitle, reverse, bold }: HeadingProps) => {
    const titleComponent = <Title bold={bold}>{title}</Title>;
    const subtitleComponent = <SubTitle bold={bold}>{subtitle}</SubTitle>;

    return (
        <>
            {!reverse ? titleComponent : subtitleComponent}
            {reverse ? titleComponent : subtitleComponent}
        </>
    );
};

export default Heading;
