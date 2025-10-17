import React, { useState, useEffect } from 'react';
import { InvestmentPackage, Transaction, User, DepositMethod, UserRole, TransactionType, TransactionStatus, WithdrawalMethod } from '../types';
import * as api from '../services/mockApi';
// FIX: Imported UsersIcon component.
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
                <StatCard title="إجمالي الاستثمار" value={`$${userData.investedAmount.toFixed(2)}`} icon={<ChartBarIcon className="w-6 h-6 text-white"/>} colorClass="bg-primary" />
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

            <DepositModal isOpen={isDepositModalOpen} onClose={() => setDepositModalOpen(false)} userId={user!.id} onDepositSuccess={() => { onAction(); fetchDashboardData(); }}/>
            {user && <WithdrawModal isOpen={isWithdrawModalOpen} onClose={() => setWithdrawModalOpen(false)} user={user} onWithdrawSuccess={() => { onAction(); fetchDashboardData(); }}/>}
        </div>
    );
};

const InvestmentPlans: React.FC<{ user: User | null; onInvest: () => void }> = ({ user, onInvest }) => {
    const [packages, setPackages] = useState<InvestmentPackage[]>([]);
    const [selectedPackage, setSelectedPackage] = useState<InvestmentPackage | null>(null);
    const [investmentAmount, setInvestmentAmount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        api.getInvestmentPackages().then(setPackages);
    }, []);

    const handleInvest = async () => {
        if (!user || !selectedPackage) return;
        setError('');
        setIsLoading(true);
        try {
            await api.investInPackage(user.id, selectedPackage.id, investmentAmount);
            setSelectedPackage(null);
            setInvestmentAmount(0);
            onInvest();
        } catch (e: any) {
            setError(e.toString());
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-3xl font-bold text-text-main">خطط الاستثمار</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {packages.map(pkg => (
                    <Card key={pkg.id} className="flex flex-col justify-between hover:border-primary transition-all duration-300 transform hover:-translate-y-1">
                        <div>
                            <h3 className="text-2xl font-bold text-primary">{pkg.name}</h3>
                            <p className="text-4xl font-bold my-4 text-white">{pkg.dailyProfitPercent}% <span className="text-lg font-normal text-text-secondary">ربح يومي</span></p>
                            <ul className="space-y-2 text-text-secondary">
                                <li>المدة: {pkg.durationDays} أيام</li>
                                <li>أقل استثمار: ${pkg.minInvestment}</li>
                                <li>أقصى استثمار: ${pkg.maxInvestment}</li>
                            </ul>
                        </div>
                        <Button className="mt-6 w-full" onClick={() => { setSelectedPackage(pkg); setInvestmentAmount(pkg.minInvestment); }}>
                            استثمر الآن
                        </Button>
                    </Card>
                ))}
            </div>
            <Modal isOpen={!!selectedPackage} onClose={() => setSelectedPackage(null)} title={`استثمر في ${selectedPackage?.name}`}>
                 <div className="space-y-4">
                    <p className="text-text-secondary">رصيدك المتاح للاستثمار: ${user?.balance.toFixed(2)}</p>
                    <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-text-main">المبلغ (USDT)</label>
                        <input
                            type="number"
                            id="amount"
                            value={investmentAmount}
                            onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                            min={selectedPackage?.minInvestment}
                            max={selectedPackage?.maxInvestment}
                            className="w-full bg-secondary text-white p-2 rounded-md mt-1 border border-gray-600 focus:ring-primary focus:border-primary"
                        />
                    </div>
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setSelectedPackage(null)}>إلغاء</Button>
                        <Button onClick={handleInvest} isLoading={isLoading}>تأكيد الاستثمار</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

const ReferralPage: React.FC<{ user: User | null }> = ({ user }) => {
    if (!user) return null;
    const referralLink = `${window.location.origin}${window.location.pathname}#?ref=${user.referralCode}`;
    
    const copyToClipboard = () => {
        navigator.clipboard.writeText(referralLink);
        alert('تم نسخ رابط الإحالة!');
    };

    return (
        <div className="animate-fade-in space-y-6">
            <h2 className="text-3xl font-bold text-text-main">ادعُ واكسب</h2>
            <Card>
                <p className="text-text-secondary">شارك رابط الإحالة الخاص بك مع الأصدقاء. عندما يقومون بالتسجيل وإجراء أول استثمار لهم، ستحصل على مكافأة بنسبة 5٪ من مبلغ استثمارهم!</p>
                <div className="mt-4 p-4 bg-secondary rounded-md flex items-center justify-between">
                    <span className="text-primary font-mono text-sm sm:text-base break-all">{referralLink}</span>
                    <Button onClick={copyToClipboard} className="mr-4 flex-shrink-0">نسخ</Button>
                </div>
            </Card>
        </div>
    );
};

const DepositModal: React.FC<{ isOpen: boolean, onClose: () => void, userId: string, onDepositSuccess: () => void }> = ({ isOpen, onClose, userId, onDepositSuccess }) => {
    const [amount, setAmount] = useState(100);
    const [proof, setProof] = useState<File | null>(null);
    const [proofPreview, setProofPreview] = useState<string | null>(null);
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
            setProofPreview(null);
            setError('');
            setCopySuccess('');
        }
    }, [isOpen]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProof(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setProofPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
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
            const reader = new FileReader();
            reader.readAsDataURL(proof);
            reader.onload = async () => {
                await api.requestDeposit(userId, amount, reader.result as string, selectedMethod.id);
                onDepositSuccess();
                onClose();
            };
        } catch (e: any) {
            setError(e.toString());
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
                        <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-sm text-text-secondary file:ml-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dark cursor-pointer mt-1"/>
                    </div>
                    {proofPreview && <img src={proofPreview} alt="Proof preview" className="max-h-40 rounded-md mx-auto"/>}
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <div className="flex justify-between gap-3">
                        <Button variant="secondary" onClick={() => setSelectedMethod(null)}>رجوع</Button>
                        <Button onClick={handleSubmit} isLoading={isLoading} disabled={!proof}>إرسال طلب الإيداع</Button>
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
            setError(e.toString());
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="سحب الأرباح">
            <div className="space-y-4">
                <p className="text-text-secondary">رصيد الأرباح المتاح للسحب: <span className="font-bold text-green-400">${user.profitBalance.toFixed(2)}</span></p>
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

export const UserPortal: React.FC = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [user, setUser] = useState<User | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        setUser(api.getLoggedInUser());
    }, [refreshKey]);
    
    const forceRefresh = () => setRefreshKey(k => k + 1);

    const tabs = [
        { id: 'dashboard', label: 'لوحة التحكم' },
        { id: 'plans', label: 'خطط الاستثمار' },
        { id: 'referrals', label: 'الإحالات' },
    ];

    if (!user) return <div className="text-center p-10 text-text-main">جاري تحميل المستخدم...</div>;

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
                {activeTab === 'dashboard' && <UserDashboard user={user} onAction={forceRefresh}/>}
                {activeTab === 'plans' && <InvestmentPlans user={user} onInvest={forceRefresh} />}
                {activeTab === 'referrals' && <ReferralPage user={user} />}
            </div>
        </div>
    );
};