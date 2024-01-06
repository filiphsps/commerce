import HeaderNavigation from '@/components/navigation/header-navigation';
import styles from '@/components/navigation/mobile-menu.module.scss';

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
