import React, { useState, useEffect } from 'react';
import { InvestmentPackage, Transaction, User, DepositMethod, UserRole } from '../types';
import * as api from '../services/mockApi';
import { Card, Button, Modal, StatCard, DollarSignIcon, ChartBarIcon, ArrowUpIcon, ArrowDownIcon } from '../components/SharedComponents';

const UserDashboard: React.FC<{ user: User | null; onAction: () => void }> = ({ user, onAction }) => {
    const [data, setData] = useState<{ user: User, totalProfit: number, transactions: Transaction[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [isDepositModalOpen, setDepositModalOpen] = useState(false);
    const [isWithdrawModalOpen, setWithdrawModalOpen] = useState(false);

    useEffect(() => {
        if (user) {
            setLoading(true);
            api.getDashboardData(user.id)
                .then(setData)
                .finally(() => setLoading(false));
        }
    }, [user]);
    
    if (loading || !data) return <div className="text-center p-10 text-text-main">Loading user data...</div>;

    const { user: userData, totalProfit, transactions } = data;

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-3xl font-bold text-text-main">Welcome, {userData.name}!</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Current Balance" value={`$${userData.balance.toFixed(2)}`} icon={<DollarSignIcon className="w-6 h-6 text-white"/>} colorClass="bg-blue-500" />
                <StatCard title="Total Invested" value={`$${userData.investedAmount.toFixed(2)}`} icon={<ChartBarIcon className="w-6 h-6 text-white"/>} colorClass="bg-primary" />
                <StatCard title="Estimated Profit" value={`$${totalProfit.toFixed(2)}`} icon={<ArrowUpIcon className="w-6 h-6 text-white"/>} colorClass="bg-yellow-500" />
            </div>

            <div className="flex gap-4">
                 <Button onClick={() => setDepositModalOpen(true)}>Deposit USDT</Button>
                 <Button onClick={() => setWithdrawModalOpen(true)} variant="secondary">Withdraw</Button>
            </div>
            
            <Card>
                <h3 className="text-xl font-bold text-text-main mb-4">Recent Transactions</h3>
                <div className="space-y-3">
                    {transactions.length > 0 ? transactions.map(t => (
                        <div key={t.id} className="flex justify-between items-center p-3 bg-secondary rounded-md">
                            <div>
                                <p className="font-semibold text-text-main">{t.type.replace('_', ' ')}</p>
                                <p className="text-sm text-text-secondary">{new Date(t.date).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                                <p className={`font-bold ${t.type === 'DEPOSIT' || t.type === 'PROFIT' ? 'text-green-400' : 'text-red-400'}`}>
                                    {t.type === 'DEPOSIT' || t.type === 'PROFIT' ? '+' : '-'}${t.amount.toFixed(2)}
                                </p>
                                <p className={`text-xs font-semibold ${t.status === 'COMPLETED' ? 'text-green-400' : t.status === 'PENDING' ? 'text-yellow-400' : 'text-red-400'}`}>{t.status}</p>
                            </div>
                        </div>
                    )) : <p className="text-text-secondary">No recent transactions.</p>}
                </div>
            </Card>

            <DepositModal isOpen={isDepositModalOpen} onClose={() => setDepositModalOpen(false)} userId={user!.id} onDepositSuccess={() => { onAction(); api.getDashboardData(user!.id).then(setData); }}/>
            <WithdrawModal isOpen={isWithdrawModalOpen} onClose={() => setWithdrawModalOpen(false)} />
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
            onInvest(); // Refresh parent data
        } catch (e: any) {
            setError(e.toString());
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-3xl font-bold text-text-main">Investment Plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {packages.map(pkg => (
                    <Card key={pkg.id} className="flex flex-col justify-between hover:border-primary transition-all duration-300 transform hover:-translate-y-1">
                        <div>
                            <h3 className="text-2xl font-bold text-primary">{pkg.name}</h3>
                            <p className="text-4xl font-bold my-4 text-white">{pkg.dailyProfitPercent}% <span className="text-lg font-normal text-text-secondary">Daily Profit</span></p>
                            <ul className="space-y-2 text-text-secondary">
                                <li>Duration: {pkg.durationDays} Days</li>
                                <li>Min Investment: ${pkg.minInvestment}</li>
                                <li>Max Investment: ${pkg.maxInvestment}</li>
                            </ul>
                        </div>
                        <Button className="mt-6 w-full" onClick={() => { setSelectedPackage(pkg); setInvestmentAmount(pkg.minInvestment); }}>
                            Invest Now
                        </Button>
                    </Card>
                ))}
            </div>
            <Modal isOpen={!!selectedPackage} onClose={() => setSelectedPackage(null)} title={`Invest in ${selectedPackage?.name}`}>
                 <div className="space-y-4">
                    <p className="text-text-secondary">Your Balance: ${user?.balance.toFixed(2)}</p>
                    <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-text-main">Amount (USDT)</label>
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
                        <Button variant="secondary" onClick={() => setSelectedPackage(null)}>Cancel</Button>
                        <Button onClick={handleInvest} isLoading={isLoading}>Confirm Investment</Button>
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
        alert('Referral link copied to clipboard!');
    };

    return (
        <div className="animate-fade-in space-y-6">
            <h2 className="text-3xl font-bold text-text-main">Refer & Earn</h2>
            <Card>
                <p className="text-text-secondary">Share your referral link with friends. When they sign up and make their first investment, you'll receive a 5% bonus of their investment amount!</p>
                <div className="mt-4 p-4 bg-secondary rounded-md flex items-center justify-between">
                    <span className="text-primary font-mono text-sm sm:text-base break-all">{referralLink}</span>
                    <Button onClick={copyToClipboard} className="ml-4 flex-shrink-0">Copy</Button>
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

    useEffect(() => {
        if(isOpen) api.getDepositMethods().then(setMethods);
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
        if (!proof || amount <= 0) {
            setError('Please provide a valid amount and a proof screenshot.');
            return;
        }
        setError('');
        setIsLoading(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(proof);
            reader.onload = async () => {
                await api.requestDeposit(userId, amount, reader.result as string);
                onDepositSuccess();
                onClose();
            };
        } catch (e: any) {
            setError(e.toString());
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Deposit USDT">
            <div className="space-y-4">
                {methods.length > 0 && (
                    <div className="p-3 bg-secondary rounded-md">
                        <p className="text-text-secondary">Send your USDT to the following address:</p>
                        <p className="text-primary font-mono text-lg break-all">{methods[0].address}</p>
                        <p className="text-xs text-amber-400 mt-1">Network: {methods[0].name}</p>
                    </div>
                )}
                 <div>
                    <label className="block text-sm font-medium text-text-main">Amount (USDT)</label>
                    <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full bg-secondary text-white p-2 rounded-md mt-1 border border-gray-600 focus:ring-primary focus:border-primary" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-main">Transaction Screenshot</label>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dark cursor-pointer mt-1"/>
                </div>
                {proofPreview && <img src={proofPreview} alt="Proof preview" className="max-h-40 rounded-md mx-auto"/>}
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} isLoading={isLoading} disabled={!proof}>Submit Deposit</Button>
                </div>
            </div>
        </Modal>
    );
};

const WithdrawModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    // Placeholder for withdrawal logic
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Withdraw Funds">
            <p className="text-text-secondary">Withdrawal functionality is coming soon. Please contact support for assistance.</p>
            <div className="flex justify-end mt-4">
                <Button onClick={onClose}>Close</Button>
            </div>
        </Modal>
    );
}

export const UserPortal: React.FC = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [user, setUser] = useState<User | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // In a real app, you'd get the current user from auth context.
    // Here we just fetch the first user.
    useEffect(() => {
        // FIX: Use UserRole enum for comparison.
        api.getUsers().then(users => setUser(users.find(u => u.role === UserRole.USER)!));
    }, [refreshKey]);
    
    const forceRefresh = () => setRefreshKey(k => k + 1);

    const tabs = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'plans', label: 'Investment Plans' },
        { id: 'referrals', label: 'Referrals' },
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
                {activeTab === 'dashboard' && <UserDashboard user={user} onAction={forceRefresh}/>}
                {activeTab === 'plans' && <InvestmentPlans user={user} onInvest={forceRefresh} />}
                {activeTab === 'referrals' && <ReferralPage user={user} />}
            </div>
        </div>
    );
};