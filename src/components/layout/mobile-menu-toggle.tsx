'use client';

import * as styles from '@/components/layout/mobile-menu-toggle.css';

import { FiAlignLeft } from 'react-icons/fi';

export default function MobileMenuToggle() {
    return (
        <div className={styles.container}>
            <FiAlignLeft className="Icon" />
        </div>
    );
}
