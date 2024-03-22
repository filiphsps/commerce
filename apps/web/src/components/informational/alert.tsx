import styles from '@/components/informational/alert.module.scss';

import { PiInfoBold } from 'react-icons/pi';

import { Content } from '@/components/typography/content';

export type AlertProps = {
    severity: 'success' | 'info' | 'warning' | 'error';
    children: React.ReactNode;
};
export const Alert = ({ children, severity, ...props }: AlertProps) => {
    return (
        <div {...props} className={styles.container} data-severity={severity}>
            <div className={styles.icon}>
                <PiInfoBold />
            </div>

            <Content className={styles.content}>{children}</Content>
        </div>
    );
};
