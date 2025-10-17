
import React, { useState } from 'react';
import { UserRole } from './types';
import { Layout } from './components/Layout';
import { UserPortal } from './pages/UserPortal';
import { AdminPortal } from './pages/AdminPortal';

const App: React.FC = () => {
    // In a real app, this would come from an authentication context/hook
    const [isLoggedIn] = useState(true);
    const [currentRole, setCurrentRole] = useState<UserRole>(UserRole.USER);

    const handleToggleRole = () => {
        setCurrentRole(prevRole => prevRole === UserRole.USER ? UserRole.ADMIN : UserRole.USER);
    };

    return (
        <Layout
            isLoggedIn={isLoggedIn}
            userRole={currentRole}
            onToggleRole={handleToggleRole}
        >
            {isLoggedIn ? (
                currentRole === UserRole.USER ? <UserPortal /> : <AdminPortal />
            ) : (
                // A landing page component would go here for logged-out users
                <div className="text-center p-10">
                    <h1 className="text-4xl font-bold text-white">مرحبًا بكم في USDT لنمو الثروة</h1>
                    <p className="text-text-secondary mt-4">الرجاء تسجيل الدخول للمتابعة.</p>
                </div>
            )}
        </Layout>
    );
};

export default App;
