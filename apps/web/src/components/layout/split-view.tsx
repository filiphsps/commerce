import type { HTMLProps, ReactNode } from 'react';

import { RemoveInvalidProps } from '@/utils/remove-invalid-props';
import styles from '@/components/layout/split-view.module.scss';

type ContainerProps = {
    children: ReactNode;
} & HTMLProps<HTMLDivElement>;
const Container = (props: ContainerProps) => {
    return <div {...props} className={`${styles.container} ${props.className || ''}`} />;
};

type PrimaryProps = {
    children: ReactNode;
} & HTMLProps<HTMLDivElement>;
const Primary = (props: PrimaryProps) => {
    return <div {...props} className={`${styles.primary} ${props.className || ''}`} />;
};

type AsideProps = {
    children: ReactNode;
} & HTMLProps<HTMLDivElement>;
const Aside = (props: AsideProps) => {
    return <div {...props} className={`${styles.aside} ${props.className || ''}`} />;
};

type SplitViewProps = {
    children: ReactNode;
    aside: ReactNode;
    primaryDesktopWidth?: number;
    asideDesktopWidth?: number;
} & HTMLProps<HTMLDivElement>;
const SplitView = (props: SplitViewProps) => {
    const { aside, children } = props;
    const primaryDesktopWidth = props.primaryDesktopWidth ?? 0.5;
    const asideDesktopWidth = props.asideDesktopWidth ?? 0.5;

    if (primaryDesktopWidth && (primaryDesktopWidth >= 1 || primaryDesktopWidth <= 0))
        throw new Error('primaryDesktopWidth must be between 0 and 1'); // TODO: FRO-14: Proper `Error` type
    if (asideDesktopWidth && (asideDesktopWidth >= 1 || asideDesktopWidth <= 0))
        throw new Error('asideDesktopWidth must be between 0 and 1'); // TODO: FRO-14: Proper `Error` type

    return (
        <Container>
            <Aside style={{ '--desktop-width': asideDesktopWidth }}>{aside}</Aside>
            <Primary {...RemoveInvalidProps(props)} style={{ '--desktop-width': primaryDesktopWidth }}>
                {children}
            </Primary>
        </Container>
    );
};

export default SplitView;
