import React, { useState, useEffect } from 'react';
import { InvestmentPackage, Transaction, User, DepositMethod, TransactionStatus, TransactionType, WithdrawalMethod, PasswordResetRequest } from '../types';
import * as api from '../services/mockApi';
import { Card, Button, Modal, StatCard, DollarSignIcon, UsersIcon, ArrowUpIcon, ArrowDownIcon, CheckCircleIcon, XCircleIcon } from '../components/SharedComponents';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getAdminDashboardData().then(setStats).finally(() => setLoading(false));
    }, []);

    if (loading || !stats) return <div className="text-center p-10 text-text-main">جاري تحميل بيانات المشرف...</div>;

    const chartData = [
        { name: 'الإجماليات', Deposits: stats.totalDeposits, Withdrawals: stats.totalWithdrawals, Invested: stats.netInvested }
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-3xl font-bold text-text-main">لوحة تحكم المشرف</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <StatCard title="إجمالي المستخدمين" value={stats.totalUsers} icon={<UsersIcon className="w-6 h-6 text-white"/>} colorClass="bg-blue-500" />
                 <StatCard title="إجمالي الإيداعات" value={`$${stats.totalDeposits.toFixed(2)}`} icon={<ArrowUpIcon className="w-6 h-6 text-white"/>} colorClass="bg-green-500" />
                 <StatCard title="إجمالي السحوبات" value={`$${stats.totalWithdrawals.toFixed(2)}`} icon={<ArrowDownIcon className="w-6 h-6 text-white"/>} colorClass="bg-red-500" />
                 <StatCard title="إجمالي المستثمر" value={`$${stats.netInvested.toFixed(2)}`} icon={<DollarSignIcon className="w-6 h-6 text-white"/>} colorClass="bg-yellow-500" />
            </div>

            <Card>
                <h3 className="text-xl font-bold text-text-main mb-4">نظرة مالية عامة</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="name" tick={{ fill: '#94A3B8' }} />
                        <YAxis tick={{ fill: '#94A3B8' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #374151' }}/>
                        <Legend wrapperStyle={{ color: '#E2E8F0' }} />
                        <Bar dataKey="Deposits" name="الإيداعات" fill="#10B981" />
                        <Bar dataKey="Withdrawals" name="السحوبات" fill="#EF4444" />
                        <Bar dataKey="Invested" name="المستثمر" fill="#FBBF24" />
                    </BarChart>
                </ResponsiveContainer>
            </Card>
        </div>
    );
};

const DepositRequests: React.FC<{onAction: () => void}> = ({onAction}) => {
    const [requests, setRequests] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<User[]>([]);
    const [depositMethods, setDepositMethods] = useState<DepositMethod[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const fetchData = () => {
         setLoading(true);
        Promise.all([
            api.getTransactions(),
            api.getUsers(),
            api.getDepositMethods()
        ]).then(([transactions, usersData, methodsData]) => {
            setRequests(transactions.filter(t => t.type === TransactionType.DEPOSIT && t.status === TransactionStatus.PENDING));
            setUsers(usersData);
            setDepositMethods(methodsData);
        }).finally(() => setLoading(false));
    }

    useEffect(() => {
       fetchData();
    }, []);

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        try {
            if (action === 'approve') await api.approveDeposit(id);
            else await api.rejectDeposit(id);
            fetchData();
            onAction();
        } catch (error) {
            console.error("Failed to process deposit:", error);
            alert("فشل الإجراء.");
        }
    };
    
    const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || 'مستخدم غير معروف';
    const getMethodName = (methodId?: string) => depositMethods.find(m => m.id === methodId)?.name || 'غير محدد';
    
    return (
        <div className="space-y-6 animate-fade-in">
             <h2 className="text-3xl font-bold text-text-main">طلبات الإيداع المعلقة</h2>
             <Card>
                {loading ? <p>جاري تحميل الطلبات...</p> : requests.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right text-text-secondary">
                            <thead className="text-xs text-text-main uppercase bg-secondary">
                                <tr>
                                    <th scope="col" className="px-6 py-3">المستخدم</th>
                                    <th scope="col" className="px-6 py-3">المبلغ</th>
                                    <th scope="col" className="px-6 py-3">الطريقة</th>
                                    <th scope="col" className="px-6 py-3">التاريخ</th>
                                    <th scope="col" className="px-6 py-3">الإثبات</th>
                                    <th scope="col" className="px-6 py-3">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(req => (
                                    <tr key={req.id} className="border-b border-gray-700 hover:bg-secondary">
                                        <td className="px-6 py-4 font-medium text-text-main">{getUserName(req.userId)}</td>
                                        <td className="px-6 py-4 text-green-400 font-bold">${req.amount}</td>
                                        <td className="px-6 py-4">{getMethodName(req.depositMethodId)}</td>
                                        <td className="px-6 py-4">{new Date(req.date).toLocaleString('ar-EG')}</td>
                                        <td className="px-6 py-4"><Button variant="secondary" onClick={() => setSelectedImage(req.proof || null)}>عرض</Button></td>
                                        <td className="px-6 py-4 flex gap-2">
                                            <button onClick={() => handleAction(req.id, 'approve')} className="text-green-400 hover:text-green-300"><CheckCircleIcon className="w-6 h-6"/></button>
                                            <button onClick={() => handleAction(req.id, 'reject')} className="text-red-400 hover:text-red-300"><XCircleIcon className="w-6 h-6"/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : <p>لا توجد طلبات إيداع معلقة.</p>}
             </Card>
             <Modal isOpen={!!selectedImage} onClose={() => setSelectedImage(null)} title="إثبات الإيداع">
                <img src={selectedImage || ''} alt="Deposit proof" className="w-full h-auto rounded-lg"/>
             </Modal>
        </div>
    );
};

const WithdrawalRequests: React.FC<{ onAction: () => void }> = ({ onAction }) => {
    const [requests, setRequests] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<User[]>([]);
    const [withdrawalMethods, setWithdrawalMethods] = useState<WithdrawalMethod[]>([]);

    const fetchData = () => {
        setLoading(true);
        Promise.all([api.getTransactions(), api.getUsers(), api.getWithdrawalMethods()])
            .then(([transactions, usersData, methodsData]) => {
                setRequests(transactions.filter(t => t.type === TransactionType.WITHDRAWAL && t.status === TransactionStatus.PENDING));
                setUsers(usersData);
                setWithdrawalMethods(methodsData);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        try {
            if (action === 'approve') await api.approveWithdrawal(id);
            else await api.rejectWithdrawal(id);
            fetchData();
            onAction();
        } catch (error) {
            console.error("Failed to process withdrawal:", error);
            alert("فشل الإجراء.");
        }
    };

    const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || 'مستخدم غير معروف';
    const getMethodName = (methodId?: string) => withdrawalMethods.find(m => m.id === methodId)?.name || 'غير محدد';

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-3xl font-bold text-text-main">طلبات السحب المعلقة</h2>
            <Card>
                {loading ? <p>جاري تحميل الطلبات...</p> : requests.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right text-text-secondary">
                            <thead className="text-xs text-text-main uppercase bg-secondary">
                                <tr>
                                    <th scope="col" className="px-6 py-3">المستخدم</th>
                                    <th scope="col" className="px-6 py-3">المبلغ</th>
                                    <th scope="col" className="px-6 py-3">الطريقة</th>
                                    <th scope="col" className="px-6 py-3">عنوان المحفظة</th>
                                    <th scope="col" className="px-6 py-3">التاريخ</th>
                                    <th scope="col" className="px-6 py-3">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(req => (
                                    <tr key={req.id} className="border-b border-gray-700 hover:bg-secondary">
                                        <td className="px-6 py-4 font-medium text-text-main">{getUserName(req.userId)}</td>
                                        <td className="px-6 py-4 text-red-400 font-bold">${req.amount}</td>
                                        <td className="px-6 py-4">{getMethodName(req.withdrawalMethodId)}</td>
                                        <td className="px-6 py-4 font-mono text-xs">
                                            <span className="break-all">{req.walletAddress}</span>
                                            <button onClick={() => navigator.clipboard.writeText(req.walletAddress || '')} className="ml-2 text-primary text-xs">نسخ</button>
                                        </td>
                                        <td className="px-6 py-4">{new Date(req.date).toLocaleString('ar-EG')}</td>
                                        <td className="px-6 py-4 flex gap-2">
                                            <button onClick={() => handleAction(req.id, 'approve')} className="text-green-400 hover:text-green-300"><CheckCircleIcon className="w-6 h-6" /></button>
                                            <button onClick={() => handleAction(req.id, 'reject')} className="text-red-400 hover:text-red-300"><XCircleIcon className="w-6 h-6" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : <p>لا توجد طلبات سحب معلقة.</p>}
            </Card>
        </div>
    );
};

const PasswordResetRequests: React.FC<{ onAction: () => void }> = ({ onAction }) => {
    const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [newPasswords, setNewPasswords] = useState<Record<string, string>>({});

    const fetchData = () => {
        setLoading(true);
        api.getPasswordResetRequests()
            .then(setRequests)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleResolve = async (requestId: string) => {
        const newPassword = newPasswords[requestId];
        try {
            await api.resolvePasswordResetRequest(requestId, newPassword);
            fetchData(); // Refresh list
            onAction(); // Refresh other admin data if needed
            setNewPasswords(prev => {
                const newState = {...prev};
                delete newState[requestId];
                return newState;
            });
        } catch (error) {
            console.error("Failed to resolve request:", error);
            alert("فشل الإجراء.");
        }
    };
    
    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-3xl font-bold text-text-main">طلبات إعادة تعيين كلمة المرور</h2>
            <Card>
                {loading ? <p>جاري تحميل الطلبات...</p> : requests.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right text-text-secondary">
                            <thead className="text-xs text-text-main uppercase bg-secondary">
                                <tr>
                                    <th scope="col" className="px-6 py-3">اسم المستخدم</th>
                                    <th scope="col" className="px-6 py-3">كلمة المرور الحالية</th>
                                    <th scope="col" className="px-6 py-3">رقم الواتساب</th>
                                    <th scope="col" className="px-6 py-3">تاريخ الطلب</th>
                                    <th scope="col" className="px-6 py-3">الإجراء</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(req => (
                                    <tr key={req.id} className="border-b border-gray-700 hover:bg-secondary">
                                        <td className="px-6 py-4 font-medium text-text-main">{req.username}</td>
                                        <td className="px-6 py-4 font-mono text-amber-400">{req.currentPassword}</td>
                                        <td className="px-6 py-4 font-mono text-left">{req.whatsappNumber}</td>
                                        <td className="px-6 py-4">{new Date(req.date).toLocaleString('ar-EG')}</td>
                                        <td className="px-6 py-4 space-y-2">
                                            <input
                                                type="text"
                                                placeholder="كلمة مرور جديدة (اختياري)"
                                                className="w-full bg-secondary-light text-white p-2 rounded-md text-sm border border-gray-600 focus:ring-primary focus:border-primary"
                                                value={newPasswords[req.id] || ''}
                                                onChange={(e) => setNewPasswords(prev => ({ ...prev, [req.id]: e.target.value }))}
                                            />
                                            <Button 
                                                variant="primary" 
                                                onClick={() => handleResolve(req.id)}
                                                className="w-full text-xs py-1"
                                            >
                                                {newPasswords[req.id] ? 'تعيين وحل' : 'حل الطلب'}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : <p>لا توجد طلبات معلقة حالياً.</p>}
            </Card>
        </div>
    );
};


const ManagePackages: React.FC = () => {
    const [packages, setPackages] = useState<InvestmentPackage[]>([]);
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingPackage, setEditingPackage] = useState<InvestmentPackage | null>(null);
    const [packageData, setPackageData] = useState({ name: '', dailyProfitPercent: 10 });

    const fetchPackages = () => api.getInvestmentPackages().then(setPackages);

    useEffect(() => {
        fetchPackages();
    }, []);
    
    useEffect(() => {
        if (editingPackage) {
            setPackageData({ name: editingPackage.name, dailyProfitPercent: editingPackage.dailyProfitPercent });
            setModalOpen(true);
        } else {
            setPackageData({ name: '', dailyProfitPercent: 10 });
        }
    }, [editingPackage]);

    const handleDelete = async (id: string) => {
        if (window.confirm('هل أنت متأكد أنك تريد حذف هذه الباقة؟')) {
            await api.deletePackage(id);
            fetchPackages();
        }
    };
    
    const handleSave = async () => {
        if (!packageData.name) return;
        if (editingPackage) {
            await api.updatePackage(editingPackage.id, packageData);
        } else {
            await api.addPackage(packageData);
        }
        fetchPackages();
        closeModal();
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingPackage(null);
    };
    
    return (
        <div className="space-y-6 animate-fade-in">
             <h2 className="text-3xl font-bold text-text-main">إدارة باقات الاستثمار</h2>
             <Button onClick={() => setModalOpen(true)}>إضافة باقة جديدة</Button>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {packages.map(pkg => (
                    <Card key={pkg.id}>
                        <h3 className="text-xl font-bold text-primary">{pkg.name}</h3>
                        <p>الربح: {pkg.dailyProfitPercent}% يومي</p>
                        <div className="flex gap-2 mt-4">
                            <Button variant="secondary" onClick={() => setEditingPackage(pkg)}>تعديل</Button>
                            <Button variant="danger" onClick={() => handleDelete(pkg.id)}>حذف</Button>
                        </div>
                    </Card>
                ))}
             </div>
             <Modal isOpen={isModalOpen} onClose={closeModal} title={editingPackage ? "تعديل الباقة" : "إضافة باقة جديدة"}>
                <div className="space-y-4">
                    <input type="text" placeholder="اسم الباقة" value={packageData.name} onChange={e => setPackageData({...packageData, name: e.target.value})} className="w-full bg-secondary text-white p-2 rounded-md border border-gray-600"/>
                    <input type="number" placeholder="الربح اليومي %" value={packageData.dailyProfitPercent} onChange={e => setPackageData({...packageData, dailyProfitPercent: Number(e.target.value)})} className="w-full bg-secondary text-white p-2 rounded-md border border-gray-600"/>
                    <Button onClick={handleSave} className="w-full">{editingPackage ? "حفظ التعديلات" : "إضافة باقة"}</Button>
                </div>
             </Modal>
        </div>
    );
};

const ManageDepositMethods: React.FC = () => {
    const [methods, setMethods] = useState<DepositMethod[]>([]);
    const [methodData, setMethodData] = useState({name: 'USDT (TRC20)', address: ''});
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingMethod, setEditingMethod] = useState<DepositMethod | null>(null);

    const fetchMethods = () => api.getDepositMethods().then(setMethods);

    useEffect(() => {
        fetchMethods();
    }, []);

    useEffect(() => {
        if (editingMethod) {
            setMethodData({ name: editingMethod.name, address: editingMethod.address });
            setModalOpen(true);
        } else {
            setMethodData({name: 'USDT (TRC20)', address: ''});
        }
    }, [editingMethod]);

    const handleSave = async () => {
        if (!methodData.name || !methodData.address) return;
        if (editingMethod) {
            await api.updateDepositMethod(editingMethod.id, methodData);
        } else {
            await api.addDepositMethod(methodData);
        }
        fetchMethods();
        closeModal();
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('هل أنت متأكد أنك تريد حذف طريقة الإيداع هذه؟')) {
            await api.deleteDepositMethod(id);
            fetchMethods();
        }
    }
    
    const closeModal = () => {
        setModalOpen(false);
        setEditingMethod(null);
    };

    return (
        <div className="space-y-6 animate-fade-in">
             <h2 className="text-3xl font-bold text-text-main">إدارة طرق الإيداع</h2>
             <Button onClick={() => setModalOpen(true)}>إضافة طريقة جديدة</Button>
             <Card>
                {methods.map(method => (
                    <div key={method.id} className="p-3 bg-secondary rounded-md mb-2 flex justify-between items-center flex-wrap gap-2">
                        <div>
                            <p className="font-bold text-text-main">{method.name}</p>
                            <p className="text-primary font-mono text-left break-all">{method.address}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => setEditingMethod(method)}>تعديل</Button>
                            <Button variant="danger" onClick={() => handleDelete(method.id)}>حذف</Button>
                        </div>
                    </div>
                ))}
             </Card>
             <Modal isOpen={isModalOpen} onClose={closeModal} title={editingMethod ? "تعديل طريقة الإيداع" : "إضافة طريقة إيداع جديدة"}>
                 <div className="space-y-4">
                    <input type="text" placeholder="اسم الطريقة" value={methodData.name} onChange={e => setMethodData({...methodData, name: e.target.value})} className="w-full bg-secondary text-white p-2 rounded-md border border-gray-600"/>
                    <input type="text" placeholder="عنوان المحفظة" value={methodData.address} onChange={e => setMethodData({...methodData, address: e.target.value})} className="w-full bg-secondary text-white p-2 rounded-md border border-gray-600"/>
                    <Button onClick={handleSave} className="w-full">{editingMethod ? "حفظ التعديلات" : "إضافة طريقة"}</Button>
                </div>
             </Modal>
        </div>
    );
};

const ManageWithdrawalMethods: React.FC = () => {
    const [methods, setMethods] = useState<WithdrawalMethod[]>([]);
    const [methodData, setMethodData] = useState({ name: '' });
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingMethod, setEditingMethod] = useState<WithdrawalMethod | null>(null);

    const fetchMethods = () => api.getWithdrawalMethods().then(setMethods);

    useEffect(() => {
        fetchMethods();
    }, []);

    useEffect(() => {
        if (editingMethod) {
            setMethodData({ name: editingMethod.name });
            setModalOpen(true);
        } else {
            setMethodData({ name: '' });
        }
    }, [editingMethod]);


    const handleSave = async () => {
        if (!methodData.name) return;
        if (editingMethod) {
            await api.updateWithdrawalMethod(editingMethod.id, methodData);
        } else {
            await api.addWithdrawalMethod(methodData);
        }
        fetchMethods();
        closeModal();
    };
    
    const handleDelete = async (id: string) => {
        if (window.confirm('هل أنت متأكد أنك تريد حذف طريقة السحب هذه؟')) {
            await api.deleteWithdrawalMethod(id);
            fetchMethods();
        }
    };
    
    const closeModal = () => {
        setModalOpen(false);
        setEditingMethod(null);
    };

    return (
        <div className="space-y-6 animate-fade-in">
             <h2 className="text-3xl font-bold text-text-main">إدارة طرق السحب</h2>
             <Button onClick={() => setModalOpen(true)}>إضافة طريقة جديدة</Button>
             <Card>
                {methods.map(method => (
                    <div key={method.id} className="p-3 bg-secondary rounded-md mb-2 flex justify-between items-center">
                        <p className="font-bold text-text-main">{method.name}</p>
                         <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => setEditingMethod(method)}>تعديل</Button>
                            <Button variant="danger" onClick={() => handleDelete(method.id)}>حذف</Button>
                        </div>
                    </div>
                ))}
             </Card>
             <Modal isOpen={isModalOpen} onClose={closeModal} title={editingMethod ? "تعديل طريقة السحب" : "إضافة طريقة سحب جديدة"}>
                 <div className="space-y-4">
                    <input type="text" placeholder="اسم الطريقة (مثال: USDT TRC20)" value={methodData.name} onChange={e => setMethodData({ name: e.target.value })} className="w-full bg-secondary text-white p-2 rounded-md border border-gray-600"/>
                    <Button onClick={handleSave} className="w-full">{editingMethod ? "حفظ التعديلات" : "إضافة طريقة"}</Button>
                </div>
             </Modal>
        </div>
    );
};


export const AdminPortal: React.FC = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [refreshKey, setRefreshKey] = useState(0);
    const forceRefresh = () => setRefreshKey(k => k + 1);

    const tabs = [
        { id: 'dashboard', label: 'لوحة التحكم' },
        { id: 'deposits', label: 'طلبات الإيداع' },
        { id: 'withdrawals', label: 'طلبات السحب' },
        { id: 'passwordResets', label: 'إعادة تعيين كلمة المرور' },
        { id: 'packages', label: 'إدارة الباقات' },
        { id: 'depositMethods', label: 'طرق الإيداع' },
        { id: 'withdrawalMethods', label: 'طرق السحب' },
    ];

    return (
        <div>
            <div className="mb-6 border-b border-gray-700">
                <nav className="-mb-px flex space-x-2 md:space-x-4 overflow-x-auto" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-main hover:border-gray-500'}
                            whitespace-nowrap py-4 px-1 md:px-2 border-b-2 font-medium text-sm transition-colors`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div>
                {activeTab === 'dashboard' && <AdminDashboard />}
                {activeTab === 'deposits' && <DepositRequests onAction={forceRefresh}/>}
                {activeTab === 'withdrawals' && <WithdrawalRequests onAction={forceRefresh} />}
                {activeTab === 'passwordResets' && <PasswordResetRequests onAction={forceRefresh} />}
                {activeTab === 'packages' && <ManagePackages />}
                {activeTab === 'depositMethods' && <ManageDepositMethods />}
                {activeTab === 'withdrawalMethods' && <ManageWithdrawalMethods />}
            </div>
        </div>
    );
};