
import React from 'react';
import { DollarSignIcon, LogoutIcon } from './SharedComponents';
import { UserRole } from '../types';

interface LayoutProps {
    children: React.ReactNode;
    userRole: UserRole;
    onLogout: () => void;
}

const Header: React.FC<Omit<LayoutProps, 'children'>> = ({ userRole, onLogout }) => (
    <header className="bg-secondary-light shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <DollarSignIcon className="w-8 h-8 text-primary" />
                <h1 className="text-2xl font-bold text-white">استثمار<span className="text-primary"></span></h1>
            </div>
            <div className="flex items-center gap-4">
                 <span className="text-sm font-semibold text-text-main hidden sm:block">
                    {userRole === UserRole.ADMIN ? 'لوحة تحكم المشرف' : 'لوحة تحكم المستخدم'}
                </span>
                <button 
                    onClick={onLogout}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 text-sm flex items-center gap-2"
                    aria-label="تسجيل الخروج"
                >
                    <LogoutIcon className="w-5 h-5"/>
                    <span className="hidden sm:block">خروج</span>
                </button>
            </div>
        </div>
    </header>
);

const Footer: React.FC = () => (
    <footer className="bg-secondary-light mt-12">
        <div className="container mx-auto px-6 py-4 text-center text-text-secondary">
            <p>&copy; {new Date().getFullYear()} استثمار. جميع الحقوق محفوظة.</p>
        </div>
    </footer>
);


export const Layout: React.FC<LayoutProps> = ({ children, userRole, onLogout }) => {
    return (
        <div className="min-h-screen flex flex-col">
            <Header userRole={userRole} onLogout={onLogout} />
            <main className="flex-grow container mx-auto p-4 md:p-6">
                {children}
            </main>
            <Footer />
        </div>
    );
};