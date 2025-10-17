
import React from 'react';
import { DollarSignIcon } from './SharedComponents';
import { UserRole } from '../types';

interface LayoutProps {
    children: React.ReactNode;
    isLoggedIn: boolean;
    userRole: UserRole;
    onToggleRole: () => void;
}

const Header: React.FC<Omit<LayoutProps, 'children'>> = ({ isLoggedIn, userRole, onToggleRole }) => (
    <header className="bg-secondary-light shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <DollarSignIcon className="w-8 h-8 text-primary" />
                <h1 className="text-2xl font-bold text-white">USDT<span className="text-primary">لنمو الثروة</span></h1>
            </div>
            {isLoggedIn && (
                <div className="flex items-center gap-4">
                     <span className="text-sm font-semibold text-text-main hidden sm:block">
                        {userRole === UserRole.ADMIN ? 'لوحة تحكم المشرف' : 'لوحة تحكم المستخدم'}
                    </span>
                    <button 
                        onClick={onToggleRole}
                        className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 text-sm"
                    >
                        التبديل إلى عرض {userRole === UserRole.ADMIN ? 'المستخدم' : 'المشرف'}
                    </button>
                </div>
            )}
        </div>
    </header>
);

const Footer: React.FC = () => (
    <footer className="bg-secondary-light mt-12">
        <div className="container mx-auto px-6 py-4 text-center text-text-secondary">
            <p>&copy; {new Date().getFullYear()} USDT لنمو الثروة. جميع الحقوق محفوظة.</p>
        </div>
    </footer>
);


export const Layout: React.FC<LayoutProps> = ({ children, isLoggedIn, userRole, onToggleRole }) => {
    return (
        <div className="min-h-screen flex flex-col">
            <Header isLoggedIn={isLoggedIn} userRole={userRole} onToggleRole={onToggleRole} />
            <main className="flex-grow container mx-auto p-4 md:p-6">
                {children}
            </main>
            <Footer />
        </div>
    );
};
