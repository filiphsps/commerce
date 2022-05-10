import de from '../../../public/static/locales/de_DE/common.json';
import en from '../../../public/static/locales/en_US/common.json';
import { useRouter } from 'next/router';

const LanguageString = (props) => {
    const router = useRouter();

    if (!props) return null;

    switch (router?.locale || 'en-US') {
        case 'de-DE':
            return de[props.id] || props.id;
        case 'en-US':
        default:
            return en[props.id] || props.id;
    }
};

export default LanguageString;
