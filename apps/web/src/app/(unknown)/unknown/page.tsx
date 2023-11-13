import Container from '#/components/container';
import type { Metadata } from 'next';
import Image from 'next/image';
import styles from '../../(admin)/admin/page.module.scss';

export type IndexUnknownPageParams = {};

export const metadata: Metadata = {
    title: 'unknown or invalid storefront'
};

export default async function IndexUnknownPage({}: { params: IndexUnknownPageParams }) {
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
                <h1>404</h1>
                <h2>Unknown or invalid storefront</h2>
            </div>

            <article className={`${styles.content}`}>
                <p>
                    The specific page, resource or storefront you are looking for does not exist. If you believe this is
                    an error, please contact the <code>Nordcom Group Inc.</code> support via{' '}
                    <a href="mailto">hi@nordcom.io</a>.
                </p>
            </article>
        </Container>
    );
}
