import Container from '#/components/container';
import type { Metadata } from 'next';
import Image from 'next/image';
import styles from './page.module.scss';

export type IndexAdminPageParams = {};

export async function generateMetadata({}: { params: IndexAdminPageParams }): Promise<Metadata> {
    return {
        title: 'dashboard'
    };
}

export default async function SearchPage({}: { params: IndexAdminPageParams }) {
    return (
        <Container className={`${styles.container}`}>
            <Image
                className={`${styles.logo}`}
                src="https://nordcom.io/logo.svg"
                alt="Nordcom Group Inc.'s Logo"
                height={75}
                width={150}
            />

            <article className={`${styles.content}`}>
                <h1>TODO: Admin interface for tenants.</h1>

                <p>
                    This currently serves as a placeholder to make sure domain routing works and continue to work
                    through deployments and domain configuration changes.
                </p>
            </article>
        </Container>
    );
}
