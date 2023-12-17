import HeaderNavigation from '@/components/HeaderNavigation';
import styles from '@/components/HeaderNavigation/mobile-menu.module.scss';

type MobileMenuProps = {
    navigation: any;
};
export const MobileMenu = ({ navigation }: MobileMenuProps) => {
    return (
        <div className={`${styles.container || ''}`}>
            <HeaderNavigation navigation={navigation} />
        </div>
    );
};
