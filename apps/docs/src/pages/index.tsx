import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import clsx from 'clsx';
import styles from './index.module.css';

type WorkspaceCard = {
    name: string;
    description: string;
    to: string;
};

const APPS: WorkspaceCard[] = [
    { name: 'Storefront', description: 'Public multi-tenant storefront.', to: '/docs/storefront/overview' },
    { name: 'Admin', description: 'Operator dashboard.', to: '/docs/admin/overview' },
    { name: 'Landing', description: 'Marketing site.', to: '/docs/landing/overview' },
];

const PACKAGES: WorkspaceCard[] = [
    { name: 'db', description: 'Mongoose models + services.', to: '/docs/db/overview' },
    { name: 'errors', description: 'Typed error hierarchy.', to: '/docs/errors/overview' },
    {
        name: 'shopify-graphql',
        description: '@inContext Apollo transform.',
        to: '/docs/shopify-graphql/overview',
    },
    { name: 'shopify-html', description: 'Shopify HTML → React/text.', to: '/docs/shopify-html/overview' },
    {
        name: 'marketing-common',
        description: 'Shared marketing primitives.',
        to: '/docs/marketing-common/overview',
    },
];

const FEATURES = [
    {
        title: 'Multi-tenant',
        body: 'One deployment, many shops. Tenants resolved by hostname in middleware.',
    },
    { title: 'Headless', body: 'Shopify Storefront + Admin APIs, with Prismic for content.' },
    {
        title: 'Type-safe',
        body: 'Strict TypeScript, noUncheckedIndexedAccess, typed errors end-to-end.',
    },
];

export default function Home(): React.JSX.Element {
    const { siteConfig } = useDocusaurusContext();
    return (
        <Layout title={siteConfig.title} description={siteConfig.tagline}>
            <main>
                <section className={styles.hero}>
                    <h1>{siteConfig.title}</h1>
                    <p>{siteConfig.tagline}</p>
                    <Link className="button button--primary button--lg" to="/docs/getting-started">
                        Get started
                    </Link>
                </section>

                <section className={styles.features}>
                    {FEATURES.map((feature) => (
                        <div key={feature.title} className={styles.feature}>
                            <h3>{feature.title}</h3>
                            <p>{feature.body}</p>
                        </div>
                    ))}
                </section>

                <section className={styles.grid}>
                    <div>
                        <h2>Apps</h2>
                        <ul className={styles.cardList}>
                            {APPS.map((card) => (
                                <li key={card.name}>
                                    <Link to={card.to} className={clsx(styles.card)}>
                                        <strong>{card.name}</strong>
                                        <span>{card.description}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h2>Packages</h2>
                        <ul className={styles.cardList}>
                            {PACKAGES.map((card) => (
                                <li key={card.name}>
                                    <Link to={card.to} className={clsx(styles.card)}>
                                        <strong>{card.name}</strong>
                                        <span>{card.description}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            </main>
        </Layout>
    );
}
