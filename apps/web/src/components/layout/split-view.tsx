import type { HTMLProps, ReactNode } from 'react';

import styles from '@/components/layout/split-view.module.scss';

type ContainerProps = {
    children: ReactNode;
} & HTMLProps<HTMLDivElement>;
const Container = (props: ContainerProps) => {
    return <div {...props} className={`${styles.container} ${props.className ?? ''}`} />;
};

type PrimaryProps = {
    children: ReactNode;
} & HTMLProps<HTMLDivElement>;
const Primary = (props: PrimaryProps) => {
    return <div {...props} className={`${styles.side} ${props.className ?? ''}`} />;
};

type AsideProps = {
    children: ReactNode;
} & HTMLProps<HTMLDivElement>;
const Aside = (props: AsideProps) => {
    return <div {...props} className={`${styles.side} ${props.className ?? ''}`} />;
};

type SplitViewProps = {
    children: ReactNode;
    aside: ReactNode;
    primaryDesktopWidth?: number;
    primaryClassName?: string;
    asideDesktopWidth?: number;
    asideClassName?: string;
    padding?: boolean;
    reverse?: boolean;
} & HTMLProps<HTMLDivElement>;
const SplitView = (props: SplitViewProps) => {
    const { aside, children, padding, reverse, primaryClassName, asideClassName } = props;
    const primaryDesktopWidth = props.primaryDesktopWidth ?? 0.5;
    const asideDesktopWidth = props.asideDesktopWidth ?? 0.5;

    if (primaryDesktopWidth && (primaryDesktopWidth >= 1 || primaryDesktopWidth <= 0))
        throw new Error('primaryDesktopWidth must be between 0 and 1'); // TODO: FRO-14: Proper `Error` type
    if (asideDesktopWidth && (asideDesktopWidth >= 1 || asideDesktopWidth <= 0))
        throw new Error('asideDesktopWidth must be between 0 and 1'); // TODO: FRO-14: Proper `Error` type

    const primaryComponent = (
        <Primary style={{ '--desktop-width': primaryDesktopWidth }} className={primaryClassName}>
            {children}
        </Primary>
    );
    const asideComponent = (
        <Aside style={{ '--desktop-width': asideDesktopWidth }} className={asideClassName}>
            {aside}
        </Aside>
    );

    return (
        <Container className={(padding && styles.padding) || ''}>
            {(!reverse && asideComponent) || primaryComponent}
            {(reverse && asideComponent) || primaryComponent}
        </Container>
    );
};

export default SplitView;
