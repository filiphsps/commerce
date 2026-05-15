import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

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
    {
        title: 'Type-safe',
        body: 'Strict TypeScript, noUncheckedIndexedAccess, typed errors end-to-end.',
    },
];

function CardLink({ card }: { card: WorkspaceCard }) {
    return (
        <Link
            to={card.to}
            className="flex flex-col gap-1 rounded-lg border border-emphasis-200 px-5 py-4 text-content no-underline transition hover:-translate-y-0.5 hover:border-primary hover:no-underline"
        >
            <strong>{card.name}</strong>
            <span className="text-emphasis-700 text-sm">{card.description}</span>
        </Link>
    );
}

export default function Home(): React.JSX.Element {
    const { siteConfig } = useDocusaurusContext();
    return (
        <Layout title={siteConfig.title} description={siteConfig.tagline}>
            <main>
                <section className="flex min-h-[50vh] flex-col items-center justify-center gap-6 px-8 pt-24 pb-16 text-center">
                    <h1>{siteConfig.title}</h1>
                    <p>{siteConfig.tagline}</p>
                    <Link className="button button--primary button--lg" to="/docs/getting-started">
                        Get started
                    </Link>
                </section>

                <section className="mx-auto grid max-w-[1100px] grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-8 px-4 pb-16 sm:px-16">
                    {FEATURES.map((feature) => (
                        <div key={feature.title}>
                            <h3 className="mb-2 text-primary">{feature.title}</h3>
                            <p>{feature.body}</p>
                        </div>
                    ))}
                </section>

                <section className="mx-auto grid max-w-[1100px] grid-cols-1 gap-12 px-8 pb-24 md:grid-cols-2 md:px-16">
                    <div>
                        <h2>Apps</h2>
                        <ul className="m-0 flex list-none flex-col gap-3 p-0">
                            {APPS.map((card) => (
                                <li key={card.name}>
                                    <CardLink card={card} />
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h2>Packages</h2>
                        <ul className="m-0 flex list-none flex-col gap-3 p-0">
                            {PACKAGES.map((card) => (
                                <li key={card.name}>
                                    <CardLink card={card} />
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            </main>
        </Layout>
    );
}
