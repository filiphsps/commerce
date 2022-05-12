import { FiShoppingCart, FiUser } from 'react-icons/fi';
import React, { FunctionComponent } from 'react';

import Link from '../Link';
import SearchBar from '../SearchBar';
import { useStore } from 'react-context-hook';

interface HeaderProps {
    store?: any;
}
const Header: FunctionComponent<HeaderProps> = (props) => {
    const { store } = props;
    const [cart, setCart] = useStore<any>('cart');

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
                    <div className="Header-Content-Search">
                        <SearchBar />
                    </div>
                    <div className="Header-Content-Actions">
                        {false && (
                            <Link to={'/account'}>
                                <FiUser className="Icon" />
                            </Link>
                        )}

                        {/*<Link to={'/search'} className="Hide-Desktop">
                            <FiSearch className="Icon" />
                        </Link>*/}
                        <Link
                            to={'/cart'}
                            className={`Cart ${
                                cart?.items?.length >= 1 && 'Cart-Active'
                            }`}
                        >
                            {cart?.items?.length >= 1 && (
                                <span className="Header-Content-CartBadge">
                                    {cart?.total_items || cart?.items?.length}
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
