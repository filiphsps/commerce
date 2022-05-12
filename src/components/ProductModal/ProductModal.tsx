import { FiChevronLeft, FiX } from 'react-icons/fi';
import React, { FunctionComponent, memo, useEffect, useState } from 'react';

import AddToCart from '../../util/AddToCart';
import Button from '../Button';
import Currency from '../Currency';
import LanguageString from '../LanguageString';
import Modal from '../Modal';
import PageLoader from '../PageLoader';
import VariantIcon from '../VariantIcon';
import fetcher from '../../api/fetcher';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { useStore } from 'react-context-hook';

interface ProductModalProps {
    data?: any;
    handle?: any;
    close: any;
    variant: any;
}
const ProductModal: FunctionComponent<ProductModalProps> = (props) => {
    const router = useRouter();
    const { data, error } = useSWR(
        `/product/${props.handle}`,
        fetcher,
        props.data
    );
    const selectedVariant = props?.variant;
    const packages = data?.variants[selectedVariant]?.packages || [];

    const [currentStep, setCurrentStep] = useState(0);
    const [selectedPackage, setSelectedPackage] = useState(
        (packages?.length || 1) - 1
    );

    useEffect(() => {
        if (currentStep < 1) return;

        AddToCart({
            id: data?.id,
            variant_id: data?.variants[selectedVariant]?.id,
            quantity:
                data?.variants[selectedVariant]?.packages[selectedPackage]
                    ?.quantity,
            action: 'add'
        })
            .then(async () => {
                await router.push('/cart');
                return props?.close();
            })
            .catch((err) => {
                console.error(err);
                return props?.close();
            });
    }, [currentStep]);

    if (!data?.handle)
        return (
            <div className="ProductModal">
                <div
                    className="ProductModal-Background"
                    onClick={props.close}
                />
                <div className="ProductModal-Block">
                    <div className="ProductModal-Block-Content"></div>
                </div>
            </div>
        );

    return (
        <Modal
            className="ProductModal"
            header={
                <>
                    <div className="Modal-Block-Header-Title">
                        {(currentStep > 0 && packages.length > 1 && (
                            <FiChevronLeft
                                className="Icon"
                                onClick={() => setCurrentStep(currentStep - 1)}
                            />
                        )) ||
                            null}
                        <LanguageString id={'add_to_cart'} />
                    </div>
                    <div
                        className="Modal-Block-Header-Action"
                        onClick={props.close}
                    >
                        <FiX className="Icon" />
                    </div>
                </>
            }
            close={props.close}
        >
            <div className="ProductModal-Block-Content">
                {(currentStep === 0 && (
                    <>
                        <div className="ProductModal-Block-Content-Title">
                            <LanguageString id={'packages'} />
                        </div>
                        <div className="ProductModal-Block-Content-Variants">
                            {packages.map((pkg, index) => {
                                const variant = data?.variants[selectedVariant];
                                return (
                                    <div
                                        key={index}
                                        onClick={() =>
                                            setSelectedPackage(index)
                                        }
                                        className={`ProductModal-Block-Content-Variants-Variant ${
                                            index === selectedPackage &&
                                            'ProductModal-Block-Content-Variants-Variant-Selected'
                                        }`}
                                    >
                                        <VariantIcon id={pkg.title} />
                                        <div className="ProductModal-Block-Content-Variants-Variant-Title">
                                            <LanguageString id={pkg.title} />
                                            <Currency
                                                className="ProductModal-Block-Content-Variants-Variant-Meta-Prices-Price"
                                                price={
                                                    (variant?.price -
                                                        variant?.price *
                                                            (pkg.discount /
                                                                100)) *
                                                    pkg.quantity
                                                }
                                                currency={variant?.currency}
                                            />
                                        </div>
                                        <div className="ProductModal-Block-Content-Variants-Variant-Meta">
                                            <div className="ProductModal-Block-Content-Variants-Variant-Meta-Prices">
                                                <Currency
                                                    className="ProductModal-Block-Content-Variants-Variant-Meta-Prices-Price"
                                                    price={
                                                        variant?.price -
                                                        variant?.price *
                                                            (pkg.discount / 100)
                                                    }
                                                    currency={variant?.currency}
                                                />
                                            </div>
                                            <div className="ProductModal-Block-Content-Variants-Variant-Meta-Cans">
                                                {pkg.quantity}{' '}
                                                <LanguageString id={'items'} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )) ||
                    null}

                {(currentStep >= 1 && <PageLoader />) || (
                    <div className="ProductModal-Block-Content-Actions">
                        <Button
                            onClick={() => {
                                return setCurrentStep(2);
                            }}
                        >
                            <LanguageString id={'add_to_cart'} />
                        </Button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default memo(ProductModal);
