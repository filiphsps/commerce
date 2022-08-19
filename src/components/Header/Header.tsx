import { FiShoppingCart, FiUser } from 'react-icons/fi';
import React, { FunctionComponent } from 'react';

import { Config } from '../../util/Config';
import Link from '../Link';
import SearchBar from '../SearchBar';
import { useCart } from 'react-use-cart';

interface HeaderProps {
    store?: any;
    navigation?: any;
}
const Header: FunctionComponent<HeaderProps> = ({ store, navigation }) => {
    const cart = useCart();

    return (
        <header className="Header">
            <div className="Header-Content">
                <Link
                    to={'/'}
                    className="Header-Content-Logo"
                    style={{
                        backgroundImage: `url("${store?.logo?.src}")`
                    }}
                />
                <nav>
                    <div className="Header-Content-Nav">
                        {navigation?.map((item: any, index: number) => {
                            return (
                                <Link key={index} to={`/${item?.handle || ''}`}>
                                    {item?.title}
                                </Link>
                            );
                        })}
                    </div>
                    <div className="Header-Content-Search">
                        <SearchBar />
                    </div>
                    <div className="Header-Content-Actions">
                        {Config.features.accounts && (
                            <Link to={'/account'}>
                                <FiUser className="Icon" />
                            </Link>
                        )}

                        <Link
                            to={'/cart'}
                            className={`Cart ${
                                cart?.totalItems >= 1 && 'Cart-Active'
                            }`}
                        >
                            {cart?.totalItems >= 1 && (
                                <span className="Header-Content-CartBadge">
                                    {cart.totalItems}
                                </span>
                            )}
                            <FiShoppingCart className="Icon" />
                        </Link>
                    </div>
                </nav>
            </div>
        </header>
    );
};

export default Header;
