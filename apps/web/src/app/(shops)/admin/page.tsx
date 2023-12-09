import { Accented, Button, Card, Heading, Label } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.scss';

export type IndexAdminPageParams = {};

export const metadata: Metadata = {
    title: {
        absolute: 'Nordcom Commerce — the Headless Commerce Solution'
    },
    description:
        'Bring the benefits of headless e-commerce to your store without any of the hassles that usually comes with it'
};

export default async function IndexAdminPage({}: { params: IndexAdminPageParams }) {
    return (
        <>
            <div className={`${styles.heading}`}>
                <Heading>
                    Commerce by <Accented>Nordcom</Accented> Group Inc
                </Heading>
                <Heading level="h2">
                    Turns out you can have your cake and eat it too! Get all of the benefits of going{' '}
                    <Accented>headless</Accented> without any of the hassles that usually comes with.
                </Heading>
            </div>

            <article className={`${styles.content}`}>
                <p>
                    We prefer working in the open, none of the content on this site is final and should only be taken as
                    placeholder content.
                    <br />
                    If you&apos;d like to learn more please reach out to us on{' '}
                    <Link
                        target="_blank"
                        rel="noopener noreferrer"
                        href="https://twitter.com/NordcomInc/"
                        title="@NordcomInc on Twitter"
                    >
                        X (Twitter)
                    </Link>
                    ;
                </p>

                <div className={styles.blocks}>
                    <Card className={styles.block}>
                        <Label>View a demo</Label>
                    </Card>
                    <Card className={styles.block}>
                        <Label>Previews, demos and mock-stores</Label>

                        <Button as={Link} href="https://demo.nordcom.io/" target="_blank">
                            Mock.shop Storefront
                        </Button>

                        <Label>Real-world usage</Label>

                        <Button as={Link} href="https://www.sweetsideofsweden.com/" target="_blank">
                            Sweet Side of Sweden
                        </Button>
                    </Card>
                </div>
            </article>
        </>
    );
}
