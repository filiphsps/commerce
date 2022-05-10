import { FiFilter, FiX } from 'react-icons/fi';
import React, { FunctionComponent, memo, useEffect, useState } from 'react';

import Checkbox from '../Checkbox';
import LanguageString from '../LanguageString';
import Modal from '../Modal';
import Scroll from 'react-scroll-up';
import fetcher from '../../api/fetcher';
// import { useModal } from '@liholiho/react-modal-hook';
import { useRouter } from 'next/router';
import useSWR from 'swr';

interface ProductFiltersProps {}
const ProductFilters: FunctionComponent<ProductFiltersProps> = (props) => {
    const router = useRouter();
    const { query } = router;
    const [expanded, setExpanded] = useState({});
    const { data, error } = useSWR([`/product/filter`], fetcher);
    useEffect(() => {
        let fields = {};
        data?.fields?.forEach((item) => {
            fields[item.field] = false;
        });
        setExpanded(fields);
    }, [data, router]);

    /*const [showModal, hideModal] = useModal(() => (
        <Modal className="ProductFilters-Modal" header={(
            <>
                <div className="Modal-Block-Header-Title">
                    <LanguageString id={'filters'} />
                </div>
                <div className="Modal-Block-Header-Action" onClick={hideModal}>
                    <FiX className="Icon" />
                </div>
            </>
        )} close={hideModal}>
            <div className="ProductFilters-Block-Content">
                {data?.fields?.map(field => {
                    if (!field.field)
                        return;

                    return (
                        <div key={field.field} className="ProductFilters-Field">
                            <div className="ProductFilters-Field-Title" onClick={() => {
                                setExpanded({
                                    ...expanded,
                                    [field.field]: !expanded[field.field]
                                });
                            }}>
                                <div>{field.field}</div>
                                <div>{!expanded[field.field] && <LanguageString id="expand" /> || <LanguageString id="hide" />}</div>
                            </div>
                            {expanded[field.field] && <div className="ProductFilters-Field-Items">
                                {field.values.map((value) => {
                                    const checked = (query[field.field] as string || '').split(',').includes(`${value.handle}`);
                                    let filter = (query[field.field] as string || '').split(',');

                                    return (
                                        <div key={value.handle} className="ProductFilters-Field-Items-Item">
                                            <Checkbox checked={checked} onClick={() => {
                                                if (checked) {
                                                    filter.splice(filter.indexOf(value.handle), 1);
                                                    router.push({
                                                        pathname: router.asPath?.split('?')[0],
                                                        query: {
                                                            ...query,
                                                            [field.field]: (filter.filter(n => n)).join(',')
                                                        }
                                                    });
                                                    return hideModal();
                                                }


                                                filter.push(value.handle);
                                                router.push({
                                                    pathname: router.asPath?.split('?')[0],
                                                    query: {
                                                        ...query,
                                                        [field.field]: (filter.filter(n => n)).join(',')
                                                    }
                                                });
                                                return hideModal();
                                            }} />

                                            {value.title}
                                        </div>
                                    );
                                })}
                            </div>}
                        </div>
                    );
                })}
            </div>
        </Modal>
    ), [router, query, data, expanded]); */

    if (!data) return null;

    return (
        <>
            <div className="ProductFilters" onClick={/*showModal*/ null}>
                <LanguageString id={'filters'} />
            </div>

            <Scroll
                showUnder={10}
                style={{
                    zIndex: 1,
                    right: undefined,
                    left: '2rem',
                    bottom: '8rem'
                }}
            >
                <div
                    className="ProductFilters-Badge"
                    onClick={/*showModal*/ null}
                >
                    <FiFilter />
                </div>
            </Scroll>
        </>
    );
};

export default memo(ProductFilters);
