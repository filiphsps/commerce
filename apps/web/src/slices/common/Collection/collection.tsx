import Content from '@/components/Content';
import Link from '@/components/link';
import PageContent from '@/components/page-content';
import { Title } from '@/components/typography/heading';
import type { StoreModel } from '@/models/StoreModel';
import type { CollectionSliceDefault } from '@/prismic/types';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import type { PrefetchData } from '@/utils/prefetch';
import { asHTML, asText } from '@prismicio/client';
import type { ReactNode } from 'react';
import styles from './collection.module.scss';

export type CollectionContainerProps = {
    slice: {
        slice_type: 'collection';
        slice_label: null;
        id?: string | undefined;
    } & CollectionSliceDefault;
    store: StoreModel;
    locale: Locale;
    i18n: LocaleDictionary;
    prefetch?: PrefetchData;
    children: ReactNode;
};
export const CollectionContainer = ({ slice, locale, children }: CollectionContainerProps) => {
    return (
        <section className={styles.container} data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
            <PageContent>
                <div className={styles.content}>
                    {asText(slice.primary.title)?.length > 0 && (
                        <div className={`${styles.header} ${styles[`align-${slice.primary.alignment || 'center'}`]}`}>
                            <Link
                                href={`/collections/${slice.primary.handle!}`}
                                title={`View all products in "${asText(slice.primary.title)}"`} // TODO: i18n.
                                locale={locale}
                                prefetch={false}
                            >
                                <Title
                                    className={styles.title}
                                    as={'div'}
                                    dangerouslySetInnerHTML={{
                                        // TODO: Use <PrismicText/>.
                                        __html: asHTML(slice.primary.title) || ''
                                    }}
                                />
                            </Link>
                            <Content
                                className={styles.body}
                                dangerouslySetInnerHTML={{
                                    // TODO: Use <PrismicText/>.
                                    __html: asHTML(slice.primary.body) || ''
                                }}
                            />
                        </div>
                    )}

                    {children}
                </div>
            </PageContent>
        </section>
    );
};
