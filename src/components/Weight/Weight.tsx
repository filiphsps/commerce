import { FunctionComponent, useEffect, useState } from 'react';

import { WeightModel } from '../../models/WeightModel';
import styled from 'styled-components';
import { useRouter } from 'next/router';

const WeightLabel = styled.div`
    text-transform: none !important;
`;

interface WeightProps {
    data: WeightModel;
}
const Weight: FunctionComponent<WeightProps> = ({ data }) => {
    const router = useRouter();
    const [locale, setLocale] = useState(router.locale || 'en-US');

    // FIXME: proper i18n support.
    useEffect(() => {
        const locale =
            navigator.languages && navigator.languages.length
                ? navigator.languages[0]
                : navigator.language;

        setLocale(locale || 'en-US');
    }, []);

    switch (locale) {
        case 'en-US':
            if (data.unit == 'g')
                return (
                    <WeightLabel>
                        {(data.value * 0.035274).toFixed(2)}oz
                    </WeightLabel>
                );
            else return <WeightLabel>{data.value}oz</WeightLabel>;
        default:
            if (data.unit == 'oz')
                return (
                    <WeightLabel>
                        {(data.value / 0.035274).toFixed(2)}g
                    </WeightLabel>
                );
            else return <WeightLabel>{data.value}g</WeightLabel>;
    }
};

export default Weight;
