import React, { FunctionComponent, useEffect, useRef } from 'react';
import styled, { css } from 'styled-components';

import { FiX } from 'react-icons/fi';
import { Input } from '../Input';
import { useRouter } from 'next/router';
import { useStore } from 'react-context-hook';

const Container = styled.div<{ open?: boolean }>`
    overflow: hidden;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;

    ${Input} {
        @media (min-width: 950px) {
            border-width: 0px;
        }
    }

    .SearchBar-Cross {
        position: absolute;
        top: 0px;
        right: 1rem;
        bottom: 0px;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 1.5rem;
        color: var(--color-dark);
        cursor: pointer;

        @media (min-width: 950px) {
            top: -0.25rem;

            &:hover,
            &:active {
                color: var(--color-gray);
            }
        }
    }

    @media (max-width: 950px) {
        ${Input} {
            width: 100%;
            border-color: var(--accent-secondary);
        }

        position: absolute;
        min-width: 100%;
        width: 100%;
        left: 0px;
        bottom: calc(-4rem - calc(var(--block-padding-large) * 2));
        padding: var(--block-padding-large);
        border-radius: 0px;
        background: var(--accent-secondary-light);
        color: var(--accent-secondary-text);
        transition: 250ms ease-in-out;
        pointer-events: none;
        opacity: 0;

        ${({ open }) =>
            open &&
            css`
                pointer-events: initial;
                opacity: 1;
            `}
    }
`;

interface SearchBarProps {
    open?: boolean;
}
const SearchBar: FunctionComponent<SearchBarProps> = ({ open }) => {
    const router = useRouter();
    const [search, setSearch] = useStore<any>('search');

    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    return (
        <Container className="SearchBar" open={open}>
            <Input
                ref={inputRef}
                className="Input data-hj-allow"
                type={'text'}
                placeholder={'Search...'}
                value={search?.phrase}
                onClick={() => setSearch({ ...search, open: true })}
                onChange={(e) => setSearch({ ...search, phrase: e?.target?.value || '' })}
                onFocus={() => setSearch({ ...search, open: true })}
                onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;

                    const q = encodeURI(search?.phrase);
                    setSearch({ open: false, phrase: '' });
                    router.push(`/search/?q=${q}`);
                }}
                spellCheck={false}
            />
            {search?.phrase && search?.open && (
                <div
                    className="SearchBar-Cross"
                    onClick={() =>
                        setSearch({
                            open: false,
                            phrase: ''
                        })
                    }
                >
                    <FiX className="Icon" />
                </div>
            )}
        </Container>
    );
};

export default SearchBar;
