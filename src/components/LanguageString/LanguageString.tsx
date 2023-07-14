import { FunctionComponent } from 'react';
import en from '../../../public/static/locales/en_US/common.json' assert { type: 'json' };
import { useRouter } from 'next/router';

interface LanguageStringProps {
    id: string;
}
const LanguageString: FunctionComponent<LanguageStringProps> = (props) => {
    const router = useRouter();

    if (!props) return null;

    switch (router?.locale || 'en-US') {
        case 'en-US':
        case 'en-GB':
        default:
            return en[props.id] || props.id;
    }
};

export default LanguageString;
