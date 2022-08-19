const ISOtoLanguageName = (language: string) => {
    switch (language) {
        case 'en_US':
            return 'english';
        default:
            return null;
    }
};

export default ISOtoLanguageName;
