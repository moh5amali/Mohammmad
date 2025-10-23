import React, { useState, useEffect } from 'react';
import { InvestmentPackage, Transaction, User, DepositMethod, UserRole, TransactionType, TransactionStatus, WithdrawalMethod } from '../types';
import * as api from '../services/mockApi';
import { Card, Button, Modal, StatCard, DollarSignIcon, ChartBarIcon, ArrowUpIcon, ArrowDownIcon, UsersIcon } from '../components/SharedComponents';

const translateTransactionType = (type: TransactionType) => {
    switch (type) {
        case TransactionType.DEPOSIT: return 'إيداع';
        case TransactionType.WITHDRAWAL: return 'سحب';
        case TransactionType.INVESTMENT: return 'استثمار';
        case TransactionType.PROFIT: return 'ربح';
        case TransactionType.REFERRAL_BONUS: return 'مكافأة إحالة';
        default: return type;
    }
};

const translateTransactionStatus = (status: TransactionStatus) => {
    switch (status) {
        case TransactionStatus.COMPLETED: return 'مكتمل';
        case TransactionStatus.PENDING: return 'قيد الانتظار';
        case TransactionStatus.REJECTED: return 'مرفوض';
        default: return status;
    }
};

const UserDashboard: React.FC<{ user: User | null; onAction: () => void }> = ({ user, onAction }) => {
    const [data, setData] = useState<{ user: User, transactions: Transaction[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [isDepositModalOpen, setDepositModalOpen] = useState(false);
    const [isWithdrawModalOpen, setWithdrawModalOpen] = useState(false);

    const fetchDashboardData = () => {
        if (user) {
            setLoading(true);
            api.getDashboardData(user.id)
                .then(setData)
                .finally(() => setLoading(false));
        }
    }

    useEffect(() => {
        fetchDashboardData();
    }, [user]);
    
    if (loading || !data) return <div className="text-center p-10 text-text-main">جاري تحميل بيانات المستخدم...</div>;

    const { user: userData, transactions } = data;

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-3xl font-bold text-text-main">مرحباً، {userData.name}!</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="الرصيد الإجمالي" value={`$${userData.balance.toFixed(2)}`} icon={<DollarSignIcon className="w-6 h-6 text-white"/>} colorClass="bg-blue-500" />
                <StatCard title="رصيد الأرباح" value={`$${userData.profitBalance.toFixed(2)}`} icon={<ArrowUpIcon className="w-6 h-6 text-white"/>} colorClass="bg-green-500" />
                <StatCard title="إجمالي المستثمر" value={`$${userData.investedAmount.toFixed(2)}`} icon={<ChartBarIcon className="w-6 h-6 text-white"/>} colorClass="bg-primary" />
                <StatCard title="كود الإحالة" value={userData.referralCode} icon={<UsersIcon className="w-6 h-6 text-white"/>} colorClass="bg-yellow-500" />
            </div>

            <div className="flex gap-4">
                 <Button onClick={() => setDepositModalOpen(true)}>إيداع USDT</Button>
                 <Button onClick={() => setWithdrawModalOpen(true)} variant="secondary">سحب الأرباح</Button>
            </div>
            
            <Card>
                <h3 className="text-xl font-bold text-text-main mb-4">المعاملات الأخيرة</h3>
                <div className="space-y-3">
                    {transactions.length > 0 ? transactions.map(t => (
                        <div key={t.id} className="flex justify-between items-center p-3 bg-secondary rounded-md">
                            <div>
                                <p className="font-semibold text-text-main">{translateTransactionType(t.type)}</p>
                                <p className="text-sm text-text-secondary">{new Date(t.date).toLocaleString('ar-EG')}</p>
                            </div>
                            <div className="text-right">
                                <p className={`font-bold ${[TransactionType.DEPOSIT, TransactionType.PROFIT, TransactionType.REFERRAL_BONUS].includes(t.type) ? 'text-green-400' : 'text-red-400'}`}>
                                    {[TransactionType.DEPOSIT, TransactionType.PROFIT, TransactionType.REFERRAL_BONUS].includes(t.type) ? '+' : '-'}${t.amount.toFixed(2)}
                                </p>
                                <p className={`text-xs font-semibold ${t.status === TransactionStatus.COMPLETED ? 'text-green-400' : t.status === TransactionStatus.PENDING ? 'text-yellow-400' : 'text-red-400'}`}>{translateTransactionStatus(t.status)}</p>
                            </div>
                        </div>
                    )) : <p className="text-text-secondary">لا توجد معاملات حديثة.</p>}
                </div>
            </Card>

            <DepositModal isOpen={isDepositModalOpen} onClose={() => setDepositModalOpen(false)} userId={user!.id} onDepositSuccess={onAction}/>
            {user && <WithdrawModal isOpen={isWithdrawModalOpen} onClose={() => setWithdrawModalOpen(false)} user={user} onWithdrawSuccess={onAction}/>}
        </div>
    );
};

const InvestmentPlans: React.FC<{ user: User | null; onInvest: () => void }> = ({ user, onInvest }) => {
    const [packages, setPackages] = useState<InvestmentPackage[]>([]);
    const [selectedPackage, setSelectedPackage] = useState<InvestmentPackage | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        api.getInvestmentPackages().then(setPackages);
    }, []);

    const handleInvest = async () => {
        if (!user || !selectedPackage) {
            setError("الرجاء اختيار باقة صالحة.");
            return;
        }
        setError('');
        setIsLoading(true);
        try {
            await api.investInPackage(user.id, selectedPackage.id, selectedPackage.price);
            setSelectedPackage(null);
            onInvest();
        } catch (e: any) {
            setError(e.message || 'حدث خطأ ما.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-3xl font-bold text-text-main">خطط الاستثمار</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {packages.map(pkg => (
                    <Card key={pkg.id} className="flex flex-col justify-between hover:border-primary transition-all duration-300 transform hover:-translate-y-1 text-center">
                        <div>
                            <h3 className="text-2xl font-bold text-primary">{pkg.name}</h3>
                            <p className="text-5xl font-extrabold my-4 text-white">${pkg.price}</p>
                            <p className="text-lg font-bold my-2 text-green-400">{pkg.dailyProfitPercent}% <span className="text-base font-normal text-text-secondary">ربح يومي</span></p>
                            <p className="text-text-secondary text-sm mt-4">الأرباح تضاف إلى رصيد الأرباح كل 24 ساعة.</p>
                        </div>
                        <Button className="mt-6 w-full" onClick={() => setSelectedPackage(pkg)}>
                            استثمر الآن
                        </Button>
                    </Card>
                ))}
            </div>
            <Modal isOpen={!!selectedPackage} onClose={() => setSelectedPackage(null)} title={`تأكيد الاستثمار`}>
                 <div className="space-y-4 text-center">
                    <p className="text-text-main text-lg">
                        هل أنت متأكد أنك تريد الاستثمار في <span className="font-bold text-primary">{selectedPackage?.name}</span>؟
                    </p>
                    <div className="p-4 bg-secondary rounded-lg">
                        <p className="text-text-secondary">سعر الباقة</p>
                        <p className="text-3xl font-bold text-white">${selectedPackage?.price.toFixed(2)}</p>
                    </div>
                    <p className="text-text-secondary">سيتم خصم المبلغ من رصيدك الأساسي.</p>
                    <p className="text-text-main">رصيدك الحالي: <span className="font-bold text-amber-400">${user?.balance.toFixed(2)}</span></p>
                    
                    {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                    
                    <div className="flex justify-center gap-4 pt-4">
                        <Button variant="secondary" onClick={() => setSelectedPackage(null)} className="w-32">إلغاء</Button>
                        <Button onClick={handleInvest} isLoading={isLoading} className="w-32">تأكيد</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

const ReferralPage: React.FC<{ user: User | null }> = ({ user }) => {
    const [copyText, setCopyText] = useState('نسخ');

    if (!user) return null;
    const referralLink = `${window.location.origin}${window.location.pathname}#?ref=${user.referralCode}`;
    
    const copyToClipboard = () => {
        navigator.clipboard.writeText(referralLink).then(() => {
            setCopyText('تم النسخ!');
            setTimeout(() => setCopyText('نسخ'), 2000);
        }, () => {
             setCopyText('فشل النسخ');
             setTimeout(() => setCopyText('نسخ'), 2000);
        });
    };

    return (
        <div className="animate-fade-in space-y-6">
            <h2 className="text-3xl font-bold text-text-main">ادعُ واكسب</h2>
            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-secondary rounded-lg">
                    <h3 className="text-lg font-bold text-text-main">إجمالي الدعوات الناجحة</h3>
                    <p className="text-3xl font-bold text-primary">{user.referredUserIds.length}</p>
                </div>
            </Card>
            <Card>
                <p className="text-text-secondary">شارك رابط الإحالة الخاص بك مع الأصدقاء. عندما يقومون بالتسجيل والموافقة على أول إيداع لهم، ستحصل على مكافأة بنسبة 5٪ من مبلغ إيداعهم تضاف مباشرة لرصيد أرباحك القابل للسحب!</p>
                <div className="mt-4 p-4 bg-secondary rounded-md flex items-center justify-between">
                    <span className="text-primary font-mono text-sm sm:text-base break-all">{referralLink}</span>
                    <Button onClick={copyToClipboard} className="mr-4 flex-shrink-0">{copyText}</Button>
                </div>
            </Card>
        </div>
    );
};

const DepositModal: React.FC<{ isOpen: boolean, onClose: () => void, userId: string, onDepositSuccess: () => void }> = ({ isOpen, onClose, userId, onDepositSuccess }) => {
    const [amount, setAmount] = useState(100);
    const [proof, setProof] = useState<string | null>(null);
    const [isProcessingImage, setIsProcessingImage] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [methods, setMethods] = useState<DepositMethod[]>([]);
    const [selectedMethod, setSelectedMethod] = useState<DepositMethod | null>(null);
    const [copySuccess, setCopySuccess] = useState('');

    useEffect(() => {
        if (isOpen) {
            api.getDepositMethods().then(setMethods);
            setSelectedMethod(null);
            setAmount(100);
            setProof(null);
            setError('');
            setCopySuccess('');
            setIsProcessingImage(false);
        }
    }, [isOpen]);

    const resizeImage = (file: File, maxWidth: number, maxHeight: number, quality: number): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                if (!event.target?.result) return reject(new Error("FileReader error"));
                const img = new Image();
                img.src = event.target.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;

                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return reject(new Error('Could not get canvas context'));
                    
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = (error) => reject(error);
            };
            reader.onerror = (error) => reject(error);
        });
    };
    
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setError('');
            setProof(null);
            setIsProcessingImage(true);
            try {
                const resizedDataUrl = await resizeImage(file, 600, 600, 0.6);
                setProof(resizedDataUrl);
            } catch (err) {
                console.error(err);
                setError('فشل في معالجة الصورة. يرجى محاولة صورة أخرى.');
            } finally {
                setIsProcessingImage(false);
            }
        }
    };

    const handleSubmit = async () => {
        if (!proof || amount <= 0 || !selectedMethod) {
            setError('يرجى تقديم مبلغ صالح ولقطة شاشة كإثبات.');
            return;
        }
        setError('');
        setIsLoading(true);
        try {
            await api.requestDeposit(userId, amount, proof, selectedMethod.id);
            onDepositSuccess();
            onClose();
        } catch (e: any) {
            setError(e.message || 'حدث خطأ ما.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = (address: string) => {
        navigator.clipboard.writeText(address).then(() => {
            setCopySuccess('تم النسخ!');
            setTimeout(() => setCopySuccess(''), 2000);
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="إيداع USDT">
            {!selectedMethod ? (
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-text-main">الخطوة 1: اختر طريقة الإيداع</h3>
                    {methods.length > 0 ? methods.map(method => (
                        <div key={method.id} onClick={() => setSelectedMethod(method)}
                             className="p-4 bg-secondary rounded-lg border border-gray-600 hover:border-primary cursor-pointer transition-all">
                            <p className="font-bold text-text-main">{method.name}</p>
                        </div>
                    )) : <p className="text-text-secondary">لا توجد طرق إيداع متاحة حالياً.</p>}
                </div>
            ) : (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-text-main">الخطوة 2: تفاصيل الإيداع</h3>
                    <p className="text-xs text-amber-400 text-center">ملاحظة: عمليات الإيداع قد تستغرق من 5 إلى 12 ساعة حتى تتم معالجتها.</p>
                    <div className="p-3 bg-secondary rounded-md">
                        <p className="text-text-secondary mb-2">أرسل USDT الخاص بك إلى العنوان التالي ({selectedMethod.name}):</p>
                        <div className="flex items-center justify-between gap-4 p-2 bg-secondary border border-gray-600 rounded-md">
                            <p className="text-primary font-mono text-sm sm:text-base break-all">{selectedMethod.address}</p>
                            <Button 
                                variant="secondary"
                                onClick={() => handleCopy(selectedMethod.address)} 
                                className="px-3 py-1 text-xs flex-shrink-0"
                            >
                                {copySuccess || 'نسخ'}
                            </Button>
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-text-main">المبلغ (USDT)</label>
                        <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full bg-secondary text-white p-2 rounded-md mt-1 border border-gray-600 focus:ring-primary focus:border-primary" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-main">لقطة شاشة للمعاملة</label>
                        <input type="file" accept="image/*" onChange={handleFileChange} disabled={isProcessingImage} className="w-full text-sm text-text-secondary file:ml-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dark cursor-pointer mt-1 disabled:opacity-50"/>
                    </div>
                    {isProcessingImage && <p className="text-amber-400 text-sm text-center">جاري معالجة الصورة...</p>}
                    {proof && <img src={proof} alt="Proof preview" className="max-h-40 rounded-md mx-auto"/>}
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <div className="flex justify-between gap-3">
                        <Button variant="secondary" onClick={() => setSelectedMethod(null)}>رجوع</Button>
                        <Button onClick={handleSubmit} isLoading={isLoading} disabled={!proof || isProcessingImage}>إرسال طلب الإيداع</Button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

const WithdrawModal: React.FC<{ isOpen: boolean; onClose: () => void; user: User; onWithdrawSuccess: () => void; }> = ({ isOpen, onClose, user, onWithdrawSuccess }) => {
    const [amount, setAmount] = useState(10);
    const [address, setAddress] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [methods, setMethods] = useState<WithdrawalMethod[]>([]);
    const [selectedMethodId, setSelectedMethodId] = useState('');

    useEffect(() => {
        if(isOpen) {
            api.getWithdrawalMethods().then(data => {
                setMethods(data);
                if (data.length > 0) {
                    setSelectedMethodId(data[0].id);
                }
            });
            setAmount(10);
            setAddress('');
            setError('');
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        setError('');
        if (amount <= 0 || !address || !selectedMethodId) {
            setError('يرجى إدخال مبلغ وعنوان محفظة صالحين واختيار طريقة السحب.');
            return;
        }
        setIsLoading(true);
        try {
            await api.requestWithdrawal(user.id, amount, address, selectedMethodId);
            alert('تم إرسال طلب السحب بنجاح!');
            onWithdrawSuccess();
            onClose();
        } catch (e: any) {
            setError(e.message || 'حدث خطأ ما.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="سحب الأرباح">
            <div className="space-y-4">
                <p className="text-text-secondary">رصيد الأرباح المتاح للسحب: <span className="font-bold text-green-400">${user.profitBalance.toFixed(2)}</span></p>
                <p className="text-xs text-amber-400 text-center">ملاحظة: عمليات السحب قد تستغرق من 5 إلى 12 ساعة حتى تتم معالجتها.</p>
                <p className="text-xs text-amber-400">الحد الأدنى للسحب هو 10$. يمكنك طلب السحب مرة كل 24 ساعة.</p>
                <div>
                    <label className="block text-sm font-medium text-text-main">طريقة السحب</label>
                    <select value={selectedMethodId} onChange={e => setSelectedMethodId(e.target.value)} className="w-full bg-secondary text-white p-2 rounded-md mt-1 border border-gray-600 focus:ring-primary focus:border-primary">
                        {methods.map(method => (
                            <option key={method.id} value={method.id}>{method.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-main">المبلغ (USDT)</label>
                    <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} min="10" max={user.profitBalance} className="w-full bg-secondary text-white p-2 rounded-md mt-1 border border-gray-600 focus:ring-primary focus:border-primary" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-main">عنوان محفظتك</label>
                    <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="أدخل عنوان محفظتك هنا" className="w-full bg-secondary text-white p-2 rounded-md mt-1 border border-gray-600 focus:ring-primary focus:border-primary" />
                </div>
                 {error && <p className="text-red-400 text-sm">{error}</p>}
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>إلغاء</Button>
                    <Button onClick={handleSubmit} isLoading={isLoading}>إرسال طلب السحب</Button>
                </div>
            </div>
        </Modal>
    );
}

// FIX: Refactor UserPortal to accept user object and a refresh handler via props.
// This resolves the error from trying to call a non-existent `getLoggedInUser` function
// and establishes a correct parent-to-child data flow.
export const UserPortal: React.FC<{ user: User; onRefresh: () => void; }> = ({ user, onRefresh }) => {
    const [activeTab, setActiveTab] = useState('dashboard');

    const forceRefresh = () => onRefresh();

    const tabs = [
        { id: 'dashboard', label: 'لوحة التحكم' },
        { id: 'plans', label: 'خطط الاستثمار' },
        { id: 'referrals', label: 'الإحالات' },
    ];

    return (
        <div>
            <div className="mb-6 border-b border-gray-700">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-main hover:border-gray-500'}
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div>
                {activeTab === 'dashboard' && <UserDashboard user={user} onAction={forceRefresh} />}
                {activeTab === 'plans' && <InvestmentPlans user={user} onInvest={forceRefresh} />}
                {activeTab === 'referrals' && <ReferralPage user={user} />}
            </div>
        </div>
    );
};