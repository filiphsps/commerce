import { Content, asHTML } from '@prismicio/client';

import ContentBlock from '../../src/components/ContentBlock';
import { FiChevronUp } from 'react-icons/fi';
import PageContent from '../../src/components/PageContent';
import { SliceComponentProps } from '@prismicio/react';
import TextBlock from '../../src/components/TextBlock';
import styled from 'styled-components';
import { useState } from 'react';

const Container = styled.div`
    width: 100%;
    padding: 0px;
    margin: 0px;

    .PageContent {
        padding-top: 0px;
        margin-top: 0px;
    }

    .Slice-Collapse-Title {
        display: grid;
        grid-template-columns: 2rem auto;
        gap: 1rem;
        justify-self: flex-start;
        align-items: center;
        padding: 0px 0px 0.5rem 0px;
        font-weight: 700;
        font-size: 1.75rem;
        line-height: 2.25rem;
        text-transform: uppercase;
        cursor: pointer;
        user-select: none;
        border-bottom: 0.2rem solid var(--color-text-dark);
        transition: 150ms all ease-in-out;

        &:hover {
            border-color: var(--accent-primary);
            color: var(--accent-primary);

            .Icon {
                color: var(--accent-primary);
            }
        }

        .Icon {
            width: 2rem;
            font-size: 1.75rem;
            line-height: 2rem;
            transition: 150ms ease-in-out;
        }

        &.Open {
            .Icon {
                rotate: 180deg;
            }
        }
    }

    .Slice-Collapse-Body {
        overflow: hidden;
        height: 0px;
        margin: 0px;
        transition: 150ms ease-in-out;

        &.Open {
            height: auto;
            margin: 1rem 0px;
        }
    }
`;

/**
 * Props for `CollapsibleText`.
 */
export type CollapsibleTextProps = SliceComponentProps<Content.CollapsibleTextSlice>;

/**
 * Component for "CollapsibleText" Slices.
 */
const CollapsibleText = ({ slice }: CollapsibleTextProps): JSX.Element => {
    const [open, setOpen] = useState(false);
    // FIXME: Set height to zero when closed to let search engines index this

    return (
        <Container>
            <ContentBlock>
                <PageContent>
                    <div
                        className={`Slice-Collapse-Title ${open ? 'Open' : ''}`}
                        onClick={() => setOpen(!open)}
                    >
                        <FiChevronUp className="Icon" /> {slice?.primary?.title}
                    </div>
                    <div
                        className={`Slice-Collapse-Body ${open ? 'Open' : ''}`}
                    >
                        {
                            <TextBlock
                                body={
                                    asHTML(slice?.primary?.text) || ''
                                }
                            />
                        }
                    </div>
                </PageContent>
            </ContentBlock>
        </Container>
    );
};

export default CollapsibleText;
