export const TitleToHandle = (title: string) => {
    return (title || '')
        .toLowerCase()
        .replace(new RegExp(' ', 'g'), '-')
        .replace(new RegExp('&', 'g'), '')
        .replace(new RegExp('å', 'g'), 'a')
        .replace(new RegExp('ä', 'g'), 'a')
        .replace(new RegExp('ö', 'g'), 'o')
        .replace(new RegExp('é', 'g'), 'e')
        .replace(new RegExp(',', 'g'), '-')
        .replace(new RegExp('[.]', 'g'), '-')
        .replace(new RegExp('[!]', 'g'), '')
        .replace(new RegExp("[']", 'g'), '')
        .replace(new RegExp('--', 'g'), '-');
};
