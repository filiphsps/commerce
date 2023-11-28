import { Button } from '#/components/button';
import Container from '#/components/container';
import { Card, Heading } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import Link from 'next/link';
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
            <div className={`${styles.heading}`}>
                <Heading>TODO</Heading>
                <Heading level="h2">An admin interface for tenants</Heading>
            </div>

            <article className={`${styles.content}`}>
                <p>
                    This currently serves as a placeholder to make sure domain routing works
                    <br />
                    and continues to work through deployments and domain configuration changes.
                </p>

                <div className={styles.blocks}>
                    <Card className={styles.block}>
                        <Heading level="h4" as="div">
                            View a demo
                        </Heading>

                        <Button as={Link} href="https://demo.nordcom.io/" target="_blank">
                            Demo Storefront
                        </Button>
                    </Card>
                    <Card className={styles.block}>
                        <Heading level="h4" as="div">
                            See it in action
                        </Heading>

                        <Button as={Link} href="https://www.sweetsideofsweden.com/" target="_blank">
                            Sweet Side of Sweden
                        </Button>
                    </Card>
                </div>
            </article>
        </Container>
    );
}
