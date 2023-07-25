import * as Sentry from '@sentry/nextjs';

import { FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import { FunctionComponent, useState } from 'react';

import { Config } from '../../src/util/Config';
import { CustomPageDocument } from '../../prismicio-types';
import ErrorPage from 'next/error';
import { NextSeo } from 'next-seo';
import Page from '@/components/Page';
import PageContent from '@/components/PageContent';
import PageLoader from '@/components/PageLoader';
import { ProductsPaginationApi } from '../../src/api/product';
import type { StoreModel } from '../../src/models/StoreModel';
import type { VendorModel } from '../../src/models/VendorModel';
import { VendorsApi } from '../../src/api/vendor';
import { asText } from '@prismicio/client';
import { createClient } from '../../prismicio';
import dynamic from 'next/dynamic';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import useSWR from 'swr';

const Breadcrumbs = dynamic(() => import('@/components/Breadcrumbs'));
const CollectionBlock = dynamic(() => import('@/components/CollectionBlock'));
const PageHeader = dynamic(() => import('@/components/PageHeader'));

const Container = styled.div`
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 2rem;
    margin-top: 1rem;

    @media (max-width: 950px) {
        grid-template-columns: 1fr;
        gap: var(--block-spacer);
    }
`;
const Content = styled.div``;

const Actions = styled.div`
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: var(--block-spacer-small);
    margin-bottom: -0.5rem;
    user-select: none;

    @media (min-width: 950px) {
        display: none;
    }
`;
const Action = styled.div`
    font-weight: 700;
    font-size: 1.25rem;
    text-transform: uppercase;
    cursor: pointer;
`;

const FilterContainer = styled.div`
    position: relative;
`;
const Filters = styled.div`
    position: sticky;
    top: 8rem;
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer);
    width: 16rem;
    user-select: none;

    @media (max-width: 950px) {
        overflow: hidden;
        width: auto;
        height: 0px;
        transition: 250ms ease-in-out;
        opacity: 0;

        &.Open {
            height: 100%;
            opacity: 1;
        }
    }
`;
const Filter = styled.div`
    background: var(--color-bright);
    border-radius: var(--block-border-radius);
`;
const FilterTitle = styled.div`
    margin-bottom: 0.5rem;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-dark);
`;
const FilterItems = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
`;
const FilterItem = styled.div`
    text-transform: uppercase;
    font-size: 1.25rem;
    font-weight: 500;
    cursor: pointer;
    color: var(--color-dark);
    border-color: var(--accent-primary);
    transition: 250ms ease-in-out;

    &.Active,
    &:hover {
        font-weight: 600;
        padding-left: 0.25rem;
        border-left: 0.2rem solid var(--accent-primary);
        color: var(--accent-primary);
    }
`;

const Pagination = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--block-spacer);
    margin: 1rem 0px;
    width: 100%;

    @media (max-width: 950px) {
        justify-content: center;
    }
`;
const PaginationAction = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--block-spacer-small);
    width: 12rem;
    padding: 1rem;
    background: var(--accent-primary);
    color: var(--accent-primary-text);
    border-radius: var(--block-border-radius);
    text-transform: uppercase;
    text-align: center;
    font-weight: 600;
    font-size: 1.25rem;
    cursor: pointer;
    transition: 250ms ease-in-out;

    @media (max-width: 950px) {
        width: 100%;
    }

    &:hover {
        gap: var(--block-spacer);
    }

    &.Disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background: #efefef;
        color: var(--color-block);

        &:hover {
            gap: var(--block-spacer-small);
        }
    }
`;

interface ShopPageProps {
    store: StoreModel;
    vendors: VendorModel[];
    page: CustomPageDocument<string>;
    data: any;
}
const ShopPage: FunctionComponent<ShopPageProps> = (props) => {
    const router = useRouter();
    const [showFilters, setShowFilters] = useState(false);
    const { data, isValidating, error } = useSWR(
        ['shop'],
        () =>
            ProductsPaginationApi({
                vendor: router.query.vendor as any,
                sorting: router.query.sorting as any,
                before: router.query.before as string,
                after: router.query.after as string
            }),
        {
            fallbackData: props.data
        }
    );

    const page_info = data?.page_info || null;
    const products = data?.products || null;

    if (!isValidating && error) return <ErrorPage statusCode={500} />;

    const state_change = () => {
        window.scrollY = 0;
        router.push(router);
    };

    return (
        <Page className="ShopPage">
            <NextSeo
                title={props.page?.data.meta_title || props.page?.data.title || 'Shop'}
                description={
                    asText(props.page.data.meta_description) || props.page.data.description || ''
                }
                canonical={`https://${Config.domain}/${router.locale}/shop/`}
                languageAlternates={
                    router?.locales?.map((locale) => ({
                        hrefLang: locale,
                        href: `https://${Config.domain}/${
                            (locale !== 'x-default' && `${locale}/`) || ''
                        }shop/`
                    })) || []
                }
                additionalMetaTags={
                    (props.page?.data.keywords && [
                        {
                            property: 'keywords',
                            content: props.page?.data.keywords
                        }
                    ]) ||
                    []
                }
            />

            <PageContent primary>
                <PageHeader
                    title={props.page?.data.title || props.page?.data.meta_title || 'Shop'}
                    subtitle={
                        props.page.data.description ||
                        asText(props.page.data.meta_description) /* TODO: Support html */
                    }
                />

                <Container>
                    <Actions>
                        <Action onClick={() => setShowFilters(!showFilters)}>Filters</Action>
                    </Actions>

                    <FilterContainer>
                        <Filters className={showFilters ? 'Open' : ''}>
                            <Filter>
                                <FilterTitle>Sorting</FilterTitle>
                                <FilterItems>
                                    <FilterItem
                                        className={
                                            !router.query.sorting ||
                                            router.query.sorting == 'BEST_SELLING'
                                                ? 'Active'
                                                : ''
                                        }
                                        onClick={() => {
                                            delete router.query.after;
                                            delete router.query.before;
                                            router.query.sorting = 'BEST_SELLING';
                                            state_change();
                                        }}
                                    >
                                        Best selling
                                    </FilterItem>
                                    <FilterItem
                                        className={router.query.sorting == 'PRICE' ? 'Active' : ''}
                                        onClick={() => {
                                            delete router.query.after;
                                            delete router.query.before;
                                            router.query.sorting = 'PRICE';
                                            state_change();
                                        }}
                                    >
                                        Price
                                    </FilterItem>
                                    <FilterItem
                                        className={
                                            router.query.sorting == 'CREATED_AT' ? 'Active' : ''
                                        }
                                        onClick={() => {
                                            delete router.query.after;
                                            delete router.query.before;
                                            router.query.sorting = 'CREATED_AT';
                                            state_change();
                                        }}
                                    >
                                        Date
                                    </FilterItem>
                                    <FilterItem
                                        className={router.query.sorting == 'TITLE' ? 'Active' : ''}
                                        onClick={() => {
                                            delete router.query.after;
                                            delete router.query.before;
                                            router.query.sorting = 'TITLE';
                                            state_change();
                                        }}
                                    >
                                        Title
                                    </FilterItem>
                                </FilterItems>
                            </Filter>

                            <Filter>
                                <FilterTitle>Brand</FilterTitle>
                                <FilterItems>
                                    {props.vendors.map((vendor) => (
                                        <FilterItem
                                            key={vendor.handle}
                                            className={
                                                router.query.vendor == vendor.title ? 'Active' : ''
                                            }
                                            onClick={() => {
                                                if (router.query.vendor == vendor.title) {
                                                    delete router.query.vendor;
                                                    state_change();
                                                    return;
                                                }

                                                delete router.query.after;
                                                delete router.query.before;
                                                router.query.vendor = vendor.title;
                                                state_change();
                                            }}
                                        >
                                            {vendor.title}
                                        </FilterItem>
                                    ))}
                                </FilterItems>
                            </Filter>
                        </Filters>
                    </FilterContainer>

                    {!isValidating ? (
                        <Content>
                            <CollectionBlock
                                data={
                                    {
                                        products: {
                                            edges: products
                                        }
                                    } as any
                                }
                                hideTitle
                                store={props.store}
                            />

                            <Pagination>
                                <PaginationAction
                                    className={!page_info.has_prev_page ? 'Disabled' : ''}
                                    onClick={() => {
                                        if (!page_info.has_prev_page) return;

                                        delete router.query.after;
                                        router.query.before = page_info.start_cursor;
                                        state_change();
                                    }}
                                >
                                    <FiArrowLeft />
                                    Previous
                                </PaginationAction>
                                <PaginationAction
                                    className={!page_info.has_next_page ? 'Disabled' : ''}
                                    onClick={() => {
                                        if (!page_info.has_next_page) return;

                                        delete router.query.before;
                                        router.query.after = page_info.end_cursor;
                                        state_change();
                                    }}
                                >
                                    Next
                                    <FiArrowRight />
                                </PaginationAction>
                            </Pagination>
                        </Content>
                    ) : (
                        <PageLoader />
                    )}
                </Container>

                <Breadcrumbs
                    pages={[
                        {
                            title: props.page?.data.title || 'Shop',
                            url: `/shop`
                        }
                    ]}
                    store={props.store}
                />
            </PageContent>
        </Page>
    );
};

export async function getStaticProps({ locale, previewData }) {
    const client = createClient({ previewData });

    let page: any = null;
    let data: any = null;
    let vendors: any = null;
    let errors: any[] = [];

    try {
        data = (await ProductsPaginationApi({
            before: undefined
        })) as any;
    } catch (error) {
        Sentry.captureException(error);
        if (error) errors.push(error);
    }

    try {
        vendors = (await VendorsApi()) as any;
    } catch (error) {
        Sentry.captureException(error);
        if (error) errors.push(error);
    }

    try {
        try {
            page = await client.getByUID('custom_page', 'shop', {
                lang: locale
            });
        } catch {
            page = await client.getByUID('custom_page', 'shop');
        }
    } catch (error) {
        Sentry.captureException(error);
        if (error) errors.push(error);
    }

    return {
        props: {
            data,
            vendors,
            page,
            errors
        },
        revalidate: 10
    };
}

export default ShopPage;
