'use client';

import english from '@/i18n/en.json';
import { components as slices } from '@/slices';
import { DefaultLocale } from '@/utils/locale';
import { RemoveInvalidProps } from '@/utils/remove-invalid-props';
import { SliceZone } from '@prismicio/react';
import { SliceSimulator } from '@slicemachine/adapter-next/simulator';

/**
 * You can probably ignore this page. It renders the Slice simulator
 * that appear in Slice Machine.
 */
export default function SliceSimulatorPage() {
    const locale = DefaultLocale();

    return (
        <SliceSimulator
            sliceZone={(props) => (
                <SliceZone
                    {...RemoveInvalidProps(props)}
                    components={slices}
                    context={{ locale, i18n: english, prefetch: {} }}
                />
            )}
        />
    );
}
