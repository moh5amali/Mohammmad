
import React, { useState, useEffect } from 'react';
import { InvestmentPackage, Transaction, User, DepositMethod } from '../types';
import * as api from '../services/mockApi';
import { Card, Button, Modal, StatCard, DollarSignIcon, UsersIcon, ArrowUpIcon, ArrowDownIcon, CheckCircleIcon, XCircleIcon } from '../components/SharedComponents';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getAdminDashboardData().then(setStats).finally(() => setLoading(false));
    }, []);

    if (loading || !stats) return <div className="text-center p-10 text-text-main">Loading admin data...</div>;

    const chartData = [
        { name: 'Totals', Deposits: stats.totalDeposits, Withdrawals: stats.totalWithdrawals, Invested: stats.netInvested }
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-3xl font-bold text-text-main">Admin Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <StatCard title="Total Users" value={stats.totalUsers} icon={<UsersIcon className="w-6 h-6 text-white"/>} colorClass="bg-blue-500" />
                 <StatCard title="Total Deposits" value={`$${stats.totalDeposits.toFixed(2)}`} icon={<ArrowUpIcon className="w-6 h-6 text-white"/>} colorClass="bg-green-500" />
                 <StatCard title="Total Withdrawals" value={`$${stats.totalWithdrawals.toFixed(2)}`} icon={<ArrowDownIcon className="w-6 h-6 text-white"/>} colorClass="bg-red-500" />
                 <StatCard title="Total Invested" value={`$${stats.netInvested.toFixed(2)}`} icon={<DollarSignIcon className="w-6 h-6 text-white"/>} colorClass="bg-yellow-500" />
            </div>

            <Card>
                <h3 className="text-xl font-bold text-text-main mb-4">Financial Overview</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="name" tick={{ fill: '#94A3B8' }} />
                        <YAxis tick={{ fill: '#94A3B8' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #374151' }}/>
                        <Legend wrapperStyle={{ color: '#E2E8F0' }} />
                        <Bar dataKey="Deposits" fill="#10B981" />
                        <Bar dataKey="Withdrawals" fill="#EF4444" />
                        <Bar dataKey="Invested" fill="#FBBF24" />
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

    useEffect(() => {
        setLoading(true);
        Promise.all([
            api.getTransactions(),
            api.getUsers()
        ]).then(([transactions, usersData]) => {
            setRequests(transactions.filter(t => t.status === 'PENDING' && t.type === 'DEPOSIT'));
            setUsers(usersData);
        }).finally(() => setLoading(false));
    }, [onAction]);

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        try {
            if (action === 'approve') await api.approveDeposit(id);
            else await api.rejectDeposit(id);
            onAction(); // This will trigger a re-fetch
        } catch (error) {
            console.error("Failed to process deposit:", error);
            alert("Action failed.");
        }
    };
    
    const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || 'Unknown User';
    
    return (
        <div className="space-y-6 animate-fade-in">
             <h2 className="text-3xl font-bold text-text-main">Pending Deposit Requests</h2>
             <Card>
                {loading ? <p>Loading requests...</p> : requests.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-text-secondary">
                            <thead className="text-xs text-text-main uppercase bg-secondary">
                                <tr>
                                    <th scope="col" className="px-6 py-3">User</th>
                                    <th scope="col" className="px-6 py-3">Amount</th>
                                    <th scope="col" className="px-6 py-3">Date</th>
                                    <th scope="col" className="px-6 py-3">Proof</th>
                                    <th scope="col" className="px-6 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(req => (
                                    <tr key={req.id} className="border-b border-gray-700 hover:bg-secondary">
                                        <td className="px-6 py-4 font-medium text-text-main">{getUserName(req.userId)}</td>
                                        <td className="px-6 py-4 text-green-400 font-bold">${req.amount}</td>
                                        <td className="px-6 py-4">{new Date(req.date).toLocaleString()}</td>
                                        <td className="px-6 py-4"><Button variant="secondary" onClick={() => setSelectedImage(req.proof || null)}>View</Button></td>
                                        <td className="px-6 py-4 flex gap-2">
                                            <button onClick={() => handleAction(req.id, 'approve')} className="text-green-400 hover:text-green-300"><CheckCircleIcon className="w-6 h-6"/></button>
                                            <button onClick={() => handleAction(req.id, 'reject')} className="text-red-400 hover:text-red-300"><XCircleIcon className="w-6 h-6"/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : <p>No pending deposit requests.</p>}
             </Card>
             <Modal isOpen={!!selectedImage} onClose={() => setSelectedImage(null)} title="Deposit Proof">
                <img src={selectedImage || ''} alt="Deposit proof" className="w-full h-auto rounded-lg"/>
             </Modal>
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
        if (window.confirm('Are you sure you want to delete this package?')) {
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
             <h2 className="text-3xl font-bold text-text-main">Manage Investment Packages</h2>
             <Button onClick={() => setModalOpen(true)}>Add New Package</Button>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {packages.map(pkg => (
                    <Card key={pkg.id}>
                        <h3 className="text-xl font-bold text-primary">{pkg.name}</h3>
                        <p>Profit: {pkg.dailyProfitPercent}% daily</p>
                        <p>Range: ${pkg.minInvestment} - ${pkg.maxInvestment}</p>
                        <p>Duration: {pkg.durationDays} days</p>
                        <Button variant="danger" className="mt-4" onClick={() => handleDelete(pkg.id)}>Delete</Button>
                    </Card>
                ))}
             </div>
             <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="Add New Package">
                {/* Form for new package */}
                <div className="space-y-4">
                    <input type="text" placeholder="Package Name" value={newPackage.name} onChange={e => setNewPackage({...newPackage, name: e.target.value})} className="w-full bg-secondary text-white p-2 rounded-md border border-gray-600"/>
                    <input type="number" placeholder="Min Investment" value={newPackage.minInvestment} onChange={e => setNewPackage({...newPackage, minInvestment: Number(e.target.value)})} className="w-full bg-secondary text-white p-2 rounded-md border border-gray-600"/>
                    <input type="number" placeholder="Max Investment" value={newPackage.maxInvestment} onChange={e => setNewPackage({...newPackage, maxInvestment: Number(e.target.value)})} className="w-full bg-secondary text-white p-2 rounded-md border border-gray-600"/>
                    <input type="number" placeholder="Daily Profit %" value={newPackage.dailyProfitPercent} onChange={e => setNewPackage({...newPackage, dailyProfitPercent: Number(e.target.value)})} className="w-full bg-secondary text-white p-2 rounded-md border border-gray-600"/>
                    <input type="number" placeholder="Duration (Days)" value={newPackage.durationDays} onChange={e => setNewPackage({...newPackage, durationDays: Number(e.target.value)})} className="w-full bg-secondary text-white p-2 rounded-md border border-gray-600"/>
                    <Button onClick={handleAdd} className="w-full">Add Package</Button>
                </div>
             </Modal>
        </div>
    );
};

const ManageMethods: React.FC = () => {
    const [methods, setMethods] = useState<DepositMethod[]>([]);
    const [newMethod, setNewMethod] = useState({name: 'USDT (TRC20)', address: ''});
    const [isModalOpen, setModalOpen] = useState(false);

    const fetchMethods = () => api.getDepositMethods().then(setMethods);

    useEffect(() => {
        fetchMethods();
    }, []);

    const handleAdd = async () => {
        await api.addDepositMethod(newMethod);
        fetchMethods();
        setModalOpen(false);
        setNewMethod({name: 'USDT (TRC20)', address: ''});
    };

    return (
        <div className="space-y-6 animate-fade-in">
             <h2 className="text-3xl font-bold text-text-main">Manage Deposit Methods</h2>
             <Button onClick={() => setModalOpen(true)}>Add New Method</Button>
             <Card>
                {methods.map(method => (
                    <div key={method.id} className="p-3 bg-secondary rounded-md mb-2">
                        <p className="font-bold text-text-main">{method.name}</p>
                        <p className="text-primary font-mono">{method.address}</p>
                    </div>
                ))}
             </Card>
             <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="Add New Deposit Method">
                 <div className="space-y-4">
                    <input type="text" placeholder="Method Name" value={newMethod.name} onChange={e => setNewMethod({...newMethod, name: e.target.value})} className="w-full bg-secondary text-white p-2 rounded-md border border-gray-600"/>
                    <input type="text" placeholder="Wallet Address" value={newMethod.address} onChange={e => setNewMethod({...newMethod, address: e.target.value})} className="w-full bg-secondary text-white p-2 rounded-md border border-gray-600"/>
                    <Button onClick={handleAdd} className="w-full">Add Method</Button>
                </div>
             </Modal>
        </div>
    );
}

export const AdminPortal: React.FC = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [refreshKey, setRefreshKey] = useState(0);
    const forceRefresh = () => setRefreshKey(k => k + 1);

    const tabs = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'deposits', label: 'Deposit Requests' },
        { id: 'packages', label: 'Manage Packages' },
        { id: 'methods', label: 'Payment Methods' },
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
                {activeTab === 'dashboard' && <AdminDashboard />}
                {activeTab === 'deposits' && <DepositRequests onAction={forceRefresh}/>}
                {activeTab === 'packages' && <ManagePackages />}
                {activeTab === 'methods' && <ManageMethods />}
            </div>
        </div>
    );
};
