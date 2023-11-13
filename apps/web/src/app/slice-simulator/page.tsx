'use client';

import english from '@/i18n/en.json';
import { components as slices } from '@/slices';
import { DefaultLocale } from '@/utils/locale';
import { RemoveInvalidProps } from '@/utils/remove-invalid-props';
import { SliceZone } from '@prismicio/react';
import { SliceSimulator } from '@slicemachine/adapter-next/simulator';

export default function SliceSimulatorPage() {
    const locale = DefaultLocale();

    return (
        <SliceSimulator
            background="#000000"
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
