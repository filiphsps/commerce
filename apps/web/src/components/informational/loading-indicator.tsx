import styles from './loading-indicator.module.scss';

export const LoadingIndicator = () => {
    return (
        <div className={styles.container}>
            <div className={styles.item} />
            <div className={styles.item} />
            <div className={styles.item} />
            <div className={styles.item} />
        </div>
    );
};
