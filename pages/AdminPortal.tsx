
import React, { useState, useEffect } from 'react';
import { InvestmentPackage, Transaction, User, DepositMethod, TransactionStatus, TransactionType, WithdrawalMethod } from '../types';
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
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const fetchData = () => {
         setLoading(true);
        Promise.all([
            api.getTransactions(),
            api.getUsers()
        ]).then(([transactions, usersData]) => {
            setRequests(transactions.filter(t => t.type === TransactionType.DEPOSIT && t.status === TransactionStatus.PENDING));
            setUsers(usersData);
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

    const fetchData = () => {
        setLoading(true);
        Promise.all([api.getTransactions(), api.getUsers()])
            .then(([transactions, usersData]) => {
                setRequests(transactions.filter(t => t.type === TransactionType.WITHDRAWAL && t.status === TransactionStatus.PENDING));
                setUsers(usersData);
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

const ManagePackages: React.FC = () => {
    const [packages, setPackages] = useState<InvestmentPackage[]>([]);
    const [isModalOpen, setModalOpen] = useState(false);
    const [newPackage, setNewPackage] = useState({ name: '', minInvestment: 100, maxInvestment: 1000, dailyProfitPercent: 10, durationDays: 30 });

    const fetchPackages = () => api.getInvestmentPackages().then(setPackages);

    useEffect(() => {
        fetchPackages();
    }, []);

    const handleDelete = async (id: string) => {
        if (window.confirm('هل أنت متأكد أنك تريد حذف هذه الباقة؟')) {
            await api.deletePackage(id);
            fetchPackages();
        }
    };
    
    const handleAdd = async () => {
        await api.addPackage(newPackage);
        fetchPackages();
        setModalOpen(false);
        setNewPackage({ name: '', minInvestment: 100, maxInvestment: 1000, dailyProfitPercent: 10, durationDays: 30 });
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
                        <p>النطاق: ${pkg.minInvestment} - ${pkg.maxInvestment}</p>
                        <p>المدة: {pkg.durationDays} أيام</p>
                        <Button variant="danger" className="mt-4" onClick={() => handleDelete(pkg.id)}>حذف</Button>
                    </Card>
                ))}
             </div>
             <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="إضافة باقة جديدة">
                <div className="space-y-4">
                    <input type="text" placeholder="اسم الباقة" value={newPackage.name} onChange={e => setNewPackage({...newPackage, name: e.target.value})} className="w-full bg-secondary text-white p-2 rounded-md border border-gray-600"/>
                    <input type="number" placeholder="أقل استثمار" value={newPackage.minInvestment} onChange={e => setNewPackage({...newPackage, minInvestment: Number(e.target.value)})} className="w-full bg-secondary text-white p-2 rounded-md border border-gray-600"/>
                    <input type="number" placeholder="أقصى استثمار" value={newPackage.maxInvestment} onChange={e => setNewPackage({...newPackage, maxInvestment: Number(e.target.value)})} className="w-full bg-secondary text-white p-2 rounded-md border border-gray-600"/>
                    <input type="number" placeholder="الربح اليومي %" value={newPackage.dailyProfitPercent} onChange={e => setNewPackage({...newPackage, dailyProfitPercent: Number(e.target.value)})} className="w-full bg-secondary text-white p-2 rounded-md border border-gray-600"/>
                    <input type="number" placeholder="المدة (أيام)" value={newPackage.durationDays} onChange={e => setNewPackage({...newPackage, durationDays: Number(e.target.value)})} className="w-full bg-secondary text-white p-2 rounded-md border border-gray-600"/>
                    <Button onClick={handleAdd} className="w-full">إضافة باقة</Button>
                </div>
             </Modal>
        </div>
    );
};

const ManageDepositMethods: React.FC = () => {
    const [methods, setMethods] = useState<DepositMethod[]>([]);
    const [newMethod, setNewMethod] = useState({name: 'USDT (TRC20)', address: ''});
    const [isModalOpen, setModalOpen] = useState(false);

    const fetchMethods = () => api.getDepositMethods().then(setMethods);

    useEffect(() => {
        fetchMethods();
    }, []);

    const handleAdd = async () => {
        if (!newMethod.name || !newMethod.address) return;
        await api.addDepositMethod(newMethod);
        fetchMethods();
        setModalOpen(false);
        setNewMethod({name: 'USDT (TRC20)', address: ''});
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('هل أنت متأكد أنك تريد حذف طريقة الإيداع هذه؟')) {
            await api.deleteDepositMethod(id);
            fetchMethods();
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
             <h2 className="text-3xl font-bold text-text-main">إدارة طرق الإيداع</h2>
             <Button onClick={() => setModalOpen(true)}>إضافة طريقة جديدة</Button>
             <Card>
                {methods.map(method => (
                    <div key={method.id} className="p-3 bg-secondary rounded-md mb-2 flex justify-between items-center">
                        <div>
                            <p className="font-bold text-text-main">{method.name}</p>
                            <p className="text-primary font-mono text-left">{method.address}</p>
                        </div>
                        <Button variant="danger" onClick={() => handleDelete(method.id)}>حذف</Button>
                    </div>
                ))}
             </Card>
             <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="إضافة طريقة إيداع جديدة">
                 <div className="space-y-4">
                    <input type="text" placeholder="اسم الطريقة" value={newMethod.name} onChange={e => setNewMethod({...newMethod, name: e.target.value})} className="w-full bg-secondary text-white p-2 rounded-md border border-gray-600"/>
                    <input type="text" placeholder="عنوان المحفظة" value={newMethod.address} onChange={e => setNewMethod({...newMethod, address: e.target.value})} className="w-full bg-secondary text-white p-2 rounded-md border border-gray-600"/>
                    <Button onClick={handleAdd} className="w-full">إضافة طريقة</Button>
                </div>
             </Modal>
        </div>
    );
};

const ManageWithdrawalMethods: React.FC = () => {
    const [methods, setMethods] = useState<WithdrawalMethod[]>([]);
    const [newMethodName, setNewMethodName] = useState('');
    const [isModalOpen, setModalOpen] = useState(false);

    const fetchMethods = () => api.getWithdrawalMethods().then(setMethods);

    useEffect(() => {
        fetchMethods();
    }, []);

    const handleAdd = async () => {
        if (!newMethodName) return;
        await api.addWithdrawalMethod({ name: newMethodName });
        fetchMethods();
        setModalOpen(false);
        setNewMethodName('');
    };
    
    const handleDelete = async (id: string) => {
        if (window.confirm('هل أنت متأكد أنك تريد حذف طريقة السحب هذه؟')) {
            await api.deleteWithdrawalMethod(id);
            fetchMethods();
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
             <h2 className="text-3xl font-bold text-text-main">إدارة طرق السحب</h2>
             <Button onClick={() => setModalOpen(true)}>إضافة طريقة جديدة</Button>
             <Card>
                {methods.map(method => (
                    <div key={method.id} className="p-3 bg-secondary rounded-md mb-2 flex justify-between items-center">
                        <p className="font-bold text-text-main">{method.name}</p>
                        <Button variant="danger" onClick={() => handleDelete(method.id)}>حذف</Button>
                    </div>
                ))}
             </Card>
             <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="إضافة طريقة سحب جديدة">
                 <div className="space-y-4">
                    <input type="text" placeholder="اسم الطريقة (مثال: USDT TRC20)" value={newMethodName} onChange={e => setNewMethodName(e.target.value)} className="w-full bg-secondary text-white p-2 rounded-md border border-gray-600"/>
                    <Button onClick={handleAdd} className="w-full">إضافة طريقة</Button>
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
        { id: 'packages', label: 'إدارة الباقات' },
        { id: 'depositMethods', label: 'طرق الإيداع' },
        { id: 'withdrawalMethods', label: 'طرق السحب' },
    ];

    return (
        <div>
            <div className="mb-6 border-b border-gray-700">
                <nav className="-mb-px flex space-x-2 md:space-x-6 overflow-x-auto" aria-label="Tabs">
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
                {activeTab === 'packages' && <ManagePackages />}
                {activeTab === 'depositMethods' && <ManageDepositMethods />}
                {activeTab === 'withdrawalMethods' && <ManageWithdrawalMethods />}
            </div>
        </div>
    );
};