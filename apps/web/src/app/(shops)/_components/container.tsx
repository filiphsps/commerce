import styles from '#/components/container.module.scss';
import type { HTMLProps, ReactNode } from 'react';

export type ContainerProps = {
    children?: ReactNode;
} & HTMLProps<HTMLDivElement>;
export default function Container(props: ContainerProps) {
    return (
        <div className={`${styles.container}`}>
            <main {...props} className={`${styles.content} ${props.className || ''}`} />
        </div>
    );
}