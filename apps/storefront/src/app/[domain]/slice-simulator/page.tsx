import 'server-only';

import { Shop } from '@nordcom/commerce-db';

import { components } from '@/slices';
import { getDictionary } from '@/utils/dictionary';
import { Locale } from '@/utils/locale';
import { SliceZone } from '@prismicio/react';
import { getSlices, SliceSimulator } from '@slicemachine/adapter-next/simulator';

import type { SliceSimulatorParams } from '@slicemachine/adapter-next/simulator';

export type SliceSimulatorPageParams = Promise<{ domain: string }>;

export default async function SliceSimulatorPage({
    params,
    searchParams: queryParams,
}: {
    params: SliceSimulatorPageParams;
} & { searchParams: Promise<SliceSimulatorParams['searchParams']> }) {
    const locale = Locale.default;

    const { domain } = await params;
    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const i18n = await getDictionary({ shop, locale });

    const searchParams = await queryParams;

    return (
        <SliceSimulator>
            <SliceZone
                slices={getSlices(searchParams.state)}
                components={components}
                context={{
                    shop: {
                        ...shop,
                        commerceProvider: {},
                        contentProvider: {},
                    },
                    i18n,
                    locale,
                    type: 'custom_page',
                    uid: 'homepage',
                    handle: 'homepage',
                    pathname: '/hello-world/',
                    menu: '__SLICE_MACHINE_TEST__',
                }}
            />
        </SliceSimulator>
    );
}
