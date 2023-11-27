import Container from '#/components/container';
import { Heading } from '@nordcom/nordstar';
import styles from './admin/page.module.scss';

export default async function NotFound() {
    return (
        <Container className={`${styles.container}`}>
            <main className={`${styles.container}`}>
                <div className={`${styles.heading}`}>
                    <Heading>404</Heading>
                    <Heading level="h2">Page not Found</Heading>
                </div>

                <article className={`${styles.content}`}>
                    <p>
                        The specific page or resource you are looking for does not exist. It may recently have been
                        removed by the author or the URL may be incorrect. Please check the URL and try again. If you
                        believe this to be an error, please get in thouch with the <code>Nordcom Group Inc.</code>{' '}
                        support via <a href="mailto:hi@nordcom.io">hi@nordcom.io</a>.
                    </p>
                </article>
            </main>
        </Container>
    );
}
