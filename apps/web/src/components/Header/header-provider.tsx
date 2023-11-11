import type { StoreModel } from '@/models/StoreModel';
import { AppProgressBar } from 'next-nprogress-bar';
import { useEffect, type ReactNode } from 'react';

type HeaderProviderProps = {
    children: ReactNode;
    store: StoreModel;
};
export const HeaderProvider = ({ children, store }: HeaderProviderProps) => {
    useEffect(() => {
        const threshold = 5;
        document.body.setAttribute('data-scrolled', Math.floor(window.scrollY) >= threshold ? 'true' : 'false');

        const onScroll = () => {
            const scroll = Math.floor(window.scrollY);

            // document.body.style.setProperty('--scroll-y', `${scroll}px`);

            const scrolled = scroll >= threshold ? 'true' : 'false';
            if (document.body.getAttribute('data-scrolled') !== scrolled)
                document.body.setAttribute('data-scrolled', scrolled);
        };
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <>
            {children}
            <AppProgressBar
                height="var(--block-padding)"
                color={store.accent.primary}
                options={{
                    showSpinner: false
                    //easing: 'ease-in-out',
                    //speed: 500
                }}
                shallowRouting
            />
        </>
    );
};
