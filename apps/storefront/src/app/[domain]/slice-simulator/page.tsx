import 'server-only';

import { Shop } from '@nordcom/commerce-db';
import { SliceZone } from '@prismicio/react';
import type { SliceSimulatorParams } from '@slicemachine/adapter-next/simulator';
import { getSlices, SliceSimulator } from '@slicemachine/adapter-next/simulator';
import { Suspense } from 'react';
import { components } from '@/slices';
import { getDictionary } from '@/utils/dictionary';
import { Locale } from '@/utils/locale';

export type SliceSimulatorPageParams = Promise<{ domain: string }>;

export default async function SliceSimulatorPage({
    params,
    searchParams: queryParams,
}: {
    params: SliceSimulatorPageParams;
} & { searchParams: Promise<SliceSimulatorParams['searchParams']> }) {
    // Read searchParams first to mark this function dynamic before Mongoose
    // calls `new Date()` (forbidden in cached server components by Cache
    // Components unless dynamic data or uncached fetch has been read first).
    const searchParams = await queryParams;

    const locale = Locale.default;

    const { domain } = await params;
    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const i18n = await getDictionary({ shop, locale });

    return (
        <Suspense>
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
        </Suspense>
    );
}
