import 'server-only';

import { Shop } from '@nordcom/commerce-db';

import { components } from '@/slices';
import { getDictionary } from '@/utils/dictionary';
import { Locale } from '@/utils/locale';
import { SliceZone } from '@prismicio/react';
import { getSlices, SliceSimulator } from '@slicemachine/adapter-next/simulator';

import type { SliceSimulatorParams } from '@slicemachine/adapter-next/simulator';

export const dynamic = 'force-dynamic';

export type SliceSimulatorPageParams = { domain: string };

export default async function SliceSimulatorPage({
    params: { domain },
    searchParams
}: {
    params: SliceSimulatorPageParams;
} & SliceSimulatorParams) {
    const locale = Locale.default;

    // Fetch the current shop.
    const shop = await Shop.findByDomain(domain);

    // Get dictionary of strings for the current locale.
    const i18n = await getDictionary({ shop, locale });

    return (
        <SliceSimulator background="unset">
            <SliceZone
                slices={getSlices(searchParams.state) || []}
                components={components}
                context={{
                    shop,
                    i18n,
                    locale,
                    type: 'custom_page',
                    uid: 'homepage',
                    handle: 'homepage',
                    pathname: '/hello-world/',
                    menu: '__SLICE_MACHINE_TEST__'
                }}
            />
        </SliceSimulator>
    );
}
