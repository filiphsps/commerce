declare namespace JSX {
    interface IntrinsicElements {}
}

interface Window {
    navigator: undefined | Navigator;
    localStorage: undefined | Storage;
    document: undefined | Document;
}
