import styles from '@/components/layout/split-view.module.scss';

import { cn } from '@/utils/tailwind';

import type { HTMLProps, ReactNode } from 'react';

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
    primaryDesktopWidth?: number | string;
    primaryClassName?: string;
    asideDesktopWidth?: number | string;
    asideClassName?: string;
    padding?: boolean;
    reverse?: boolean;
} & HTMLProps<HTMLDivElement>;
const SplitView = ({
    aside,
    children,
    padding,
    reverse,
    primaryDesktopWidth,
    primaryClassName,
    asideDesktopWidth,
    asideClassName,
    ...props
}: SplitViewProps) => {
    let _primaryDesktopWidth: string = `${primaryDesktopWidth}` || '0.5',
        _asideDesktopWidth: string = `${asideDesktopWidth}` || '0.5';

    if (typeof primaryDesktopWidth === 'number') {
        if (primaryDesktopWidth && (primaryDesktopWidth >= 1 || primaryDesktopWidth <= 0))
            throw new Error('primaryDesktopWidth must be between 0 and 1'); // TODO: FRO-14: Proper `Error` type

        _primaryDesktopWidth = (primaryDesktopWidth ?? 0.5).toString();
    }
    if (typeof asideDesktopWidth === 'number') {
        if (asideDesktopWidth && (asideDesktopWidth >= 1 || asideDesktopWidth <= 0))
            throw new Error('asideDesktopWidth must be between 0 and 1'); // TODO: FRO-14: Proper `Error` type

        _asideDesktopWidth = (asideDesktopWidth ?? 0.5).toString();
    }

    const primaryComponent = (
        <Primary
            style={{ '--desktop-width': _primaryDesktopWidth }}
            className={cn(primaryClassName, typeof primaryDesktopWidth === 'string' && styles.specific)}
        >
            {children}
        </Primary>
    );
    const asideComponent = (
        <Aside
            style={{ '--desktop-width': _asideDesktopWidth }}
            className={cn(asideClassName, typeof asideDesktopWidth === 'string' && styles.specific)}
        >
            {aside}
        </Aside>
    );

    return (
        <Container {...props} className={padding ? styles.padding : ''}>
            {!reverse ? asideComponent : primaryComponent}
            {reverse ? asideComponent : primaryComponent}
        </Container>
    );
};

SplitView.displayName = 'Nordcom.Layout.SplitView';
export default SplitView;
