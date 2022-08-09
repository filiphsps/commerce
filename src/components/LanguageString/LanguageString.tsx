import { FunctionComponent } from 'react';
import { useRouter } from 'next/router';

import de from '../../../public/static/locales/de_DE/common.json';
import en from '../../../public/static/locales/en_US/common.json';

interface LanguageStringProps {
    id: string
}
const LanguageString: FunctionComponent<LanguageStringProps> = (props) => {
    const router = useRouter();

    if (!props) return null;

    switch (router?.locale || 'en-US') {
        case 'de-DE':
            return de[props.id] || (props.id);
        case 'en-US':
        default:
            return en[props.id] || (props.id);
    }
};

export default LanguageString;
