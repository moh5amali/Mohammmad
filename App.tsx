
import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { Layout } from './components/Layout';
import { UserPortal } from './components/UserPortal';
import { AdminPortal } from './pages/AdminPortal';
import * as api from './services/mockApi';
import { Button, Card, DollarSignIcon } from './components/SharedComponents';

const AuthPage: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            let user;
            if (isLoginView) {
                user = await api.login(username, password);
            } else {
                user = await api.register(name, username, password, phoneNumber);
            }
            onLogin(user);
        } catch (err: any) {
            setError(err.toString());
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-secondary flex flex-col justify-center items-center p-4">
             <div className="flex items-center gap-2 mb-8">
                <DollarSignIcon className="w-12 h-12 text-primary" />
                <h1 className="text-4xl font-bold text-white">استثمار</h1>
            </div>
            <Card className="w-full max-w-md">
                <h2 className="text-2xl font-bold text-center text-text-main mb-6">
                    {isLoginView ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLoginView && (
                         <>
                            <div>
                                <label className="block text-sm font-medium text-text-main">الاسم</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-secondary text-white p-2 rounded-md mt-1 border border-gray-600 focus:ring-primary focus:border-primary"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-main">رقم الهاتف</label>
                                <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} required className="w-full bg-secondary text-white p-2 rounded-md mt-1 border border-gray-600 focus:ring-primary focus:border-primary"/>
                            </div>
                        </>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-text-main">اسم المستخدم</label>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="w-full bg-secondary text-white p-2 rounded-md mt-1 border border-gray-600 focus:ring-primary focus:border-primary"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-main">كلمة المرور</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-secondary text-white p-2 rounded-md mt-1 border border-gray-600 focus:ring-primary focus:border-primary"/>
                    </div>
                    
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                    
                    <Button type="submit" className="w-full" isLoading={isLoading}>
                        {isLoginView ? 'دخول' : 'تسجيل'}
                    </Button>
                </form>
                <p className="text-center text-sm text-text-secondary mt-4">
                    {isLoginView ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}
                    <button onClick={() => setIsLoginView(!isLoginView)} className="text-primary hover:underline font-semibold mx-1">
                        {isLoginView ? 'أنشئ حساباً' : 'سجل الدخول'}
                    </button>
                </p>
            </Card>
        </div>
    );
};


const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const user = api.getLoggedInUser();
        if (user) {
            setCurrentUser(user);
        }
        setIsLoading(false);
    }, []);

    const handleLogin = (user: User) => {
        setCurrentUser(user);
    };

    const handleLogout = () => {
        api.logout();
        setCurrentUser(null);
    };

    if (isLoading) {
        return <div className="bg-secondary text-white text-center p-12">جاري التحميل...</div>
    }

    if (!currentUser) {
        return <AuthPage onLogin={handleLogin} />;
    }

    return (
        <Layout
            userRole={currentUser.role}
            onLogout={handleLogout}
        >
            {currentUser.role === UserRole.USER ? <UserPortal /> : <AdminPortal />}
        </Layout>
    );
};

export default App;