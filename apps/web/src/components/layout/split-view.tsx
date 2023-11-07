import type { HTMLProps, ReactNode } from 'react';

import styles from '@/components/layout/split-view.module.scss';
import { RemoveInvalidProps } from '@/utils/remove-invalid-props';

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
const SplitView = (props: SplitViewProps) => {
    const { aside, children, padding, reverse, primaryClassName, asideClassName } = props;
    let primaryDesktopWidth: string = `${props.primaryDesktopWidth}` || '0.5',
        asideDesktopWidth: string = `${props.asideDesktopWidth}` || '0.5';

    if (typeof props.primaryDesktopWidth === 'number') {
        if (props.primaryDesktopWidth && (props.primaryDesktopWidth >= 1 || props.primaryDesktopWidth <= 0))
            throw new Error('primaryDesktopWidth must be between 0 and 1'); // TODO: FRO-14: Proper `Error` type

        primaryDesktopWidth = (props.primaryDesktopWidth ?? 0.5).toString();
    }
    if (typeof props.asideDesktopWidth === 'number') {
        if (props.asideDesktopWidth && (props.asideDesktopWidth >= 1 || props.asideDesktopWidth <= 0))
            throw new Error('asideDesktopWidth must be between 0 and 1'); // TODO: FRO-14: Proper `Error` type

        asideDesktopWidth = (props.asideDesktopWidth ?? 0.5).toString();
    }

    const primaryComponent = (
        <Primary
            style={{ '--desktop-width': primaryDesktopWidth }}
            className={`${primaryClassName || ''} ${
                (typeof props.primaryDesktopWidth === 'string' && styles.specific) || ''
            }`}
        >
            {children}
        </Primary>
    );
    const asideComponent = (
        <Aside
            style={{ '--desktop-width': asideDesktopWidth }}
            className={`${asideClassName || ''} ${
                (typeof props.asideDesktopWidth === 'string' && styles.specific) || ''
            }`}
        >
            {aside}
        </Aside>
    );

    return (
        <Container
            {...RemoveInvalidProps({ ...props, children: undefined })}
            className={(padding && styles.padding) || ''}
        >
            {(!reverse && asideComponent) || primaryComponent}
            {(reverse && asideComponent) || primaryComponent}
        </Container>
    );
};

export default SplitView;
