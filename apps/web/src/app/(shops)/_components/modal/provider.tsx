'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';

interface ModalContextProps {
    show: (content: ReactNode) => void;
    hide: () => void;
}

const ModalContext = createContext<ModalContextProps | undefined>(undefined);

export type ModalProviderProps = {
    children: ReactNode;
};
export function ModalProvider({ children }: ModalProviderProps) {
    const [modalContent, setModalContent] = useState<ReactNode | null>(null);
    const [showModal, setShowModal] = useState(false);

    const show = (content: ReactNode) => {
        setModalContent(content);
        setShowModal(true);
    };

    const hide = () => {
        setShowModal(false);
        setTimeout(() => {
            setModalContent(null);
        }, 300);
    };

    return (
        <ModalContext.Provider value={{ show, hide }}>
            {children}
            {showModal ? <>{modalContent}</> : null}
        </ModalContext.Provider>
    );
}

export function useModal() {
    return useContext(ModalContext);
}
