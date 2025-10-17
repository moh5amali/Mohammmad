import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import * as api from './services/mockApi';
import { Layout } from './components/Layout';
import { UserPortal } from './components/UserPortal';
import { AdminPortal } from './pages/AdminPortal';
import { Card, Button, Spinner } from './components/SharedComponents';

// Initialize mock data when app loads
api.initializeData();

const AuthFormCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="min-h-screen bg-secondary text-text-main flex items-center justify-center p-4 animate-fade-in">
        <Card className="w-full max-w-sm">
            <h2 className="text-2xl font-bold text-center text-white mb-6">{title}</h2>
            {children}
        </Card>
    </div>
);

const App: React.FC = () => {
    const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [authView, setAuthView] = useState<'login' | 'register' | 'forgot'>('login');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const checkUser = async () => {
            setIsLoading(true);
            const user = api.getLoggedInUser();
            setLoggedInUser(user);
            setIsLoading(false);
        };
        checkUser();
    }, []);

    const handleLogout = () => {
        api.logout();
        setLoggedInUser(null);
        setAuthView('login');
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        const form = e.target as HTMLFormElement;
        const usernameOrEmail = (form.elements.namedItem('usernameOrEmail') as HTMLInputElement).value;
        const password = (form.elements.namedItem('password') as HTMLInputElement).value;

        try {
            const user = await api.login(usernameOrEmail, password);
            setLoggedInUser(user);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const form = e.target as HTMLFormElement;
        const name = (form.elements.namedItem('name') as HTMLInputElement).value;
        const username = (form.elements.namedItem('username') as HTMLInputElement).value;
        const email = (form.elements.namedItem('email') as HTMLInputElement).value;
        const phone = (form.elements.namedItem('phone') as HTMLInputElement).value;
        const password = (form.elements.namedItem('password') as HTMLInputElement).value;

        try {
            await api.register({ name, username, email, phone, password });
            setAuthView('login');
            setMessage('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.');
        } catch (err: any) {
            setError(err.message);
        }
    };
    
    const handleRequestReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        const form = e.target as HTMLFormElement;
        const usernameOrEmail = (form.elements.namedItem('usernameOrEmail') as HTMLInputElement).value;
        const whatsappNumber = (form.elements.namedItem('whatsapp') as HTMLInputElement).value;
        
        await api.requestPasswordReset(usernameOrEmail, whatsappNumber);
        
        setMessage('تم إرسال طلبك إلى الإدارة. سيتم التواصل معك عبر الواتساب.');
        setAuthView('login');
    };

    if (isLoading) {
        return <div className="min-h-screen bg-secondary flex items-center justify-center"><Spinner /></div>;
    }

    if (loggedInUser) {
        return (
            <Layout userRole={loggedInUser.role} onLogout={handleLogout}>
                {loggedInUser.role === UserRole.ADMIN ? <AdminPortal /> : <UserPortal />}
            </Layout>
        );
    }
    
    const inputClass = "w-full bg-secondary text-white p-2 rounded-md mt-1 border border-gray-600 focus:ring-primary focus:border-primary";

    if (authView === 'login') {
        return (
            <AuthFormCard title="تسجيل الدخول">
                <form onSubmit={handleLogin} className="space-y-4">
                    <input name="usernameOrEmail" type="text" placeholder="اسم المستخدم أو البريد الإلكتروني" required className={inputClass} />
                    <input name="password" type="password" placeholder="كلمة المرور" required className={inputClass} />
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    {message && <p className="text-green-400 text-sm text-center">{message}</p>}
                    <Button type="submit" className="w-full">دخول</Button>
                    <div className="text-sm text-center text-text-secondary">
                        <button type="button" onClick={() => { setError(''); setMessage(''); setAuthView('forgot'); }} className="hover:text-primary">نسيت كلمة المرور؟</button>
                        <span className="mx-2">|</span>
                        <button type="button" onClick={() => { setError(''); setMessage(''); setAuthView('register'); }} className="hover:text-primary">إنشاء حساب جديد</button>
                    </div>
                </form>
            </AuthFormCard>
        );
    }

    if (authView === 'register') {
        return (
            <AuthFormCard title="إنشاء حساب جديد">
                <form onSubmit={handleRegister} className="space-y-4">
                    <input name="name" type="text" placeholder="الاسم الكامل" required className={inputClass} />
                    <input name="username" type="text" placeholder="اسم المستخدم" required className={inputClass} />
                    <input name="email" type="email" placeholder="البريد الإلكتروني" required className={inputClass} />
                    <input name="phone" type="tel" placeholder="رقم الهاتف" required className={inputClass} />
                    <input name="password" type="password" placeholder="كلمة المرور" required className={inputClass} />
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <Button type="submit" className="w-full">إنشاء حساب</Button>
                    <div className="text-sm text-center text-text-secondary">
                        <button type="button" onClick={() => { setError(''); setMessage(''); setAuthView('login'); }} className="hover:text-primary">لديك حساب بالفعل؟ تسجيل الدخول</button>
                    </div>
                </form>
            </AuthFormCard>
        );
    }
    
    if (authView === 'forgot') {
        return (
            <AuthFormCard title="استعادة كلمة المرور">
                 <form onSubmit={handleRequestReset} className="space-y-4">
                    <p className="text-text-secondary text-center text-sm">أدخل بيانات حسابك ورقم واتساب للتواصل.</p>
                    <input name="usernameOrEmail" type="text" placeholder="اسم المستخدم أو البريد الإلكتروني" required className={inputClass} />
                    <input name="whatsapp" type="tel" placeholder="رقم الواتساب" required className={inputClass} />
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <Button type="submit" className="w-full">إرسال الطلب</Button>
                    <div className="text-sm text-center text-text-secondary">
                        <button type="button" onClick={() => { setError(''); setMessage(''); setAuthView('login'); }} className="hover:text-primary">العودة لتسجيل الدخول</button>
                    </div>
                </form>
            </AuthFormCard>
        );
    }
    
    return null; // Should not be reached
};

export default App;