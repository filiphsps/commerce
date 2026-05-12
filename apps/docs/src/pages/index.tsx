import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

export default function Home(): React.JSX.Element {
    const { siteConfig } = useDocusaurusContext();
    return (
        <Layout title={siteConfig.title} description={siteConfig.tagline}>
            <main className={styles.hero}>
                <h1>{siteConfig.title}</h1>
                <p>{siteConfig.tagline}</p>
                <Link className="button button--primary button--lg" to="/docs/getting-started">
                    Get started
                </Link>
            </main>
        </Layout>
    );
}
