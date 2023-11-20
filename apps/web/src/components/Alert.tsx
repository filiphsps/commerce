import Content from '@/components/Content';
import styles from '@/components/informational/alert.module.scss';
import { PiInfoBold } from 'react-icons/pi';

export type AlertProps = {
    severity: 'success' | 'info' | 'warning' | 'error';
    children: React.ReactNode;
};

export const Alert = ({ children, severity }: AlertProps) => {
    return (
        <div
            className={styles.container}
            style={
                {
                    '--icon-color': 'var(--color-block-pastel-lime-dark)'
                } as React.CSSProperties
            }
            data-severity={severity}
        >
            <div className={styles.icon}>
                <PiInfoBold />
            </div>

            <Content className={styles.content}>{children}</Content>
        </div>
    );
};
