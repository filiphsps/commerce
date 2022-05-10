import lookup from 'country-code-lookup';

const GetCountryName = (code: string) => {
    switch (code?.toLowerCase()) {
        case 'eu':
            return 'Europe';
        case 'world-wide':
            return 'World Wide';
        default:
            return lookup.byInternet(code)?.country || code;
    }
};

export default GetCountryName;
