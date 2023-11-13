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
                    The specific page, resource or even storefront you are looking for does not exist. If you believe this
                    to be an error, please get in contact with the <code>Nordcom Group Inc.</code> support through{' '}
                    <a href="mailto:hi@nordcom.io">hi@nordcom.io</a>.
                </p>
            </article>
        </Container>
    );
}
