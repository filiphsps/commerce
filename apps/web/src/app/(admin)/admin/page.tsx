import Container from '#/components/container';
import Header from '#/components/header';
import { Heading } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import styles from './page.module.scss';

export type IndexAdminPageParams = {};

export const metadata: Metadata = {
    title: {
        absolute: 'Nordcom Commerce — the Headless Commerce Solution'
    }
};

export default async function IndexAdminPage({}: { params: IndexAdminPageParams }) {
    return (
        <Container className={`${styles.container}`}>
            <Header />

            <div className={`${styles.heading}`}>
                <Heading>TODO</Heading>
                <Heading level="h2">An admin interface for tenants</Heading>
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
