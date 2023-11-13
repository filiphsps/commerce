import Container from '#/components/container';
import type { Metadata } from 'next';
import Image from 'next/image';
import styles from './page.module.scss';

export type IndexAdminPageParams = {};

export const metadata: Metadata = {
    title: {
        absolute: 'nordcom commerce — the headless commerce solution'
    }
};

export default async function IndexAdminPage({}: { params: IndexAdminPageParams }) {
    return (
        <Container className={`${styles.container}`}>
            <header className={`${styles.header}`}>
                <Image
                    className={`${styles.logo}`}
                    src="https://nordcom.io/logo.svg"
                    alt="Nordcom Group Inc.'s Logo"
                    height={75}
                    width={150}
                    priority
                />
            </header>

            <div className={`${styles.heading}`}>
                <h1>TODO</h1>
                <h2>An admin interface for tenants</h2>
            </div>

            <article className={`${styles.content}`}>
                <p>
                    This currently serves as a placeholder to make sure domain routing works and continue to work
                    through deployments and domain configuration changes.
                </p>
            </article>
        </Container>
    );
}
