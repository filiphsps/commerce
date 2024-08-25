declare module 'react-ipgeolocation' {
    export default function useGeoLocation(): {
        country?: string;
        error: boolean;
        isLoading: boolean;
    };
}
