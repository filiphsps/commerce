import { useEffect, type ReactNode } from 'react';

type HeaderProviderProps = {
    children?: ReactNode;
};
export const HeaderProvider = ({ children }: HeaderProviderProps) => {
    useEffect(() => {
        const onScroll = () => {
            const scroll = Math.floor(window.scrollY);

            // document.body.style.setProperty('--scroll-y', `${scroll}px`);

            if (scroll < 50) document.body.removeAttribute('data-scrolled');
            else document.body.setAttribute('data-scrolled', 'true');
        };
        window.addEventListener('scroll', onScroll);

        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return <>{children}</>;
};
