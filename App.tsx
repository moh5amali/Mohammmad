import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import * as api from './services/mockApi';
import { Layout } from './components/Layout';
import { UserPortal } from './components/UserPortal';
import { AdminPortal } from './pages/AdminPortal';
import { Card, Button, Spinner, DollarSignIcon } from './components/SharedComponents';

// Initialize mock data when app loads
api.initializeData();

const AuthFormCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="min-h-screen bg-secondary text-text-main flex items-center justify-center p-4 animate-fade-in">
        <Card className="w-full max-w-sm">
            <DollarSignIcon className="w-16 h-16 text-primary mx-auto mb-4" />
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

    // Effect for Firebase auth state listener
    useEffect(() => {
        setIsLoading(true);
        const unsubscribe = api.onAuthChange((user) => {
            setLoggedInUser(user);
            setIsLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);


    // Effect for one-time setup on initial load (referral code)
    useEffect(() => {
        try {
            if (window.location.hash.includes('?ref=')) {
                const params = new URLSearchParams(window.location.hash.substring(window.location.hash.indexOf('?')));
                const refCode = params.get('ref');
                if (refCode) {
                    localStorage.setItem('referralCode', refCode);
                    setAuthView('register');
                }
            }
        } catch (e) {
            console.error("Could not parse referral code from URL", e);
        }
    }, []);
    
    // FIX: Add a function to refresh the logged-in user's data from the backend.
    const refreshUser = async () => {
        if (loggedInUser) {
            try {
                const data = await api.getDashboardData(loggedInUser.id);
                setLoggedInUser(data.user);
            } catch (e) {
                console.error("Failed to refresh user", e);
            }
        }
    };

    const handleLogout = async () => {
        await api.logout();
        setLoggedInUser(null);
        setAuthView('login');
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        const form = e.target as HTMLFormElement;
        const username = (form.elements.namedItem('username') as HTMLInputElement).value;
        const password = (form.elements.namedItem('password') as HTMLInputElement).value;

        try {
            const user = await api.login(username, password);
            // setLoggedInUser is handled by onAuthChange listener
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
        const phone = (form.elements.namedItem('phone') as HTMLInputElement).value;
        const password = (form.elements.namedItem('password') as HTMLInputElement).value;
        const referredByCode = localStorage.getItem('referralCode');

        try {
            await api.register({ name, username, phone, password }, referredByCode);
            localStorage.removeItem('referralCode'); // Clear after use
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
        const username = (form.elements.namedItem('username') as HTMLInputElement).value;
        const whatsappNumber = (form.elements.namedItem('whatsapp') as HTMLInputElement).value;
        
        try {
            await api.requestPasswordReset(username, whatsappNumber);
            setMessage('تم إرسال طلبك إلى الإدارة. سيتم التواصل معك عبر الواتساب.');
            setAuthView('login');
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (isLoading) {
        return <div className="min-h-screen bg-secondary flex items-center justify-center"><Spinner /></div>;
    }

    if (loggedInUser) {
        return (
            <Layout userRole={loggedInUser.role} onLogout={handleLogout}>
                {/* FIX: Pass user data and refresh handler to UserPortal. */}
                {loggedInUser.role === UserRole.ADMIN ? <AdminPortal /> : <UserPortal user={loggedInUser} onRefresh={refreshUser} />}
            </Layout>
        );
    }
    
    const inputClass = "w-full bg-secondary text-white p-2 rounded-md mt-1 border border-gray-600 focus:ring-primary focus:border-primary";

    if (authView === 'login') {
        return (
            <AuthFormCard title="تسجيل الدخول">
                <form onSubmit={handleLogin} className="space-y-4">
                    <input name="username" type="text" placeholder="اسم المستخدم" required className={inputClass} />
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
                    <p className="text-text-secondary text-center text-sm">أدخل اسم المستخدم ورقم الهاتف المسجل. ستتواصل معك الإدارة عبر الواتساب.</p>
                    <input name="username" type="text" placeholder="اسم المستخدم" required className={inputClass} />
                    <input name="whatsapp" type="tel" placeholder="رقم الهاتف (واتساب)" required className={inputClass} />
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