import { AppData, User, InvestmentPackage, Transaction, TransactionStatus, TransactionType, UserInvestment, DepositMethod, WithdrawalMethod, UserRole } from '../types';

// In-memory database
let db: AppData = {
    users: [
        { id: 'user-1', name: 'Alice', email: 'alice@example.com', role: UserRole.USER, balance: 1500, investedAmount: 500, referralCode: 'ALICE123', createdAt: new Date('2023-10-01') },
        { id: 'user-2', name: 'Bob', email: 'bob@example.com', role: UserRole.USER, balance: 200, investedAmount: 1000, referralCode: 'BOB456', referredBy: 'user-1', createdAt: new Date('2023-10-05') },
        { id: 'admin-1', name: 'Admin', email: 'admin@example.com', role: UserRole.ADMIN, balance: 0, investedAmount: 0, referralCode: 'ADMIN789', createdAt: new Date('2023-09-01') },
    ],
    packages: [
        { id: 'pkg-1', name: 'Starter Plan', minInvestment: 100, maxInvestment: 999, dailyProfitPercent: 10, durationDays: 30 },
        { id: 'pkg-2', name: 'Pro Plan', minInvestment: 1000, maxInvestment: 4999, dailyProfitPercent: 10, durationDays: 60 },
        { id: 'pkg-3', name: 'VIP Plan', minInvestment: 5000, maxInvestment: 10000, dailyProfitPercent: 10, durationDays: 90 },
    ],
    userInvestments: [
        { id: 'inv-1', userId: 'user-1', packageId: 'pkg-1', amount: 500, startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
        { id: 'inv-2', userId: 'user-2', packageId: 'pkg-2', amount: 1000, startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
    ],
    transactions: [
        { id: 'txn-1', userId: 'user-1', type: TransactionType.DEPOSIT, status: TransactionStatus.COMPLETED, amount: 2000, date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) },
        { id: 'txn-2', userId: 'user-2', type: TransactionType.DEPOSIT, status: TransactionStatus.PENDING, amount: 500, date: new Date(), proof: 'https://picsum.photos/400/300' },
    ],
    depositMethods: [
        { id: 'dep-1', name: 'USDT (TRC20)', address: 'TXYZ...ABC' },
    ],
    withdrawalMethods: [
        { id: 'wd-1', name: 'USDT (TRC20)' },
    ],
};

const simulateDelay = <T,>(data: T): Promise<T> => new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(data))), 500));

// --- API Functions ---

export const getDashboardData = (userId: string) => {
    const user = db.users.find(u => u.id === userId);
    if (!user) return Promise.reject('User not found');

    const investments = db.userInvestments.filter(inv => inv.userId === userId);
    const transactions = db.transactions.filter(t => t.userId === userId).sort((a, b) => b.date.getTime() - a.date.getTime());
    
    const totalProfit = investments.reduce((acc, inv) => {
        const pkg = db.packages.find(p => p.id === inv.packageId);
        if (!pkg) return acc;
        const daysInvested = Math.floor((new Date().getTime() - new Date(inv.startDate).getTime()) / (1000 * 3600 * 24));
        return acc + (inv.amount * (pkg.dailyProfitPercent / 100) * daysInvested);
    }, 0);

    return simulateDelay({ user, totalProfit: parseFloat(totalProfit.toFixed(2)), transactions: transactions.slice(0, 5) });
};

export const getAdminDashboardData = () => {
    // FIX: Use UserRole enum for comparison.
    const totalUsers = db.users.filter(u => u.role === UserRole.USER).length;
    const totalDeposits = db.transactions.filter(t => t.type === TransactionType.DEPOSIT && t.status === TransactionStatus.COMPLETED).reduce((sum, t) => sum + t.amount, 0);
    const totalWithdrawals = db.transactions.filter(t => t.type === TransactionType.WITHDRAWAL && t.status === TransactionStatus.COMPLETED).reduce((sum, t) => sum + t.amount, 0);
    const totalInvested = db.userInvestments.reduce((sum, inv) => sum + inv.amount, 0);
    const pendingDeposits = db.transactions.filter(t => t.type === TransactionType.DEPOSIT && t.status === TransactionStatus.PENDING);
    return simulateDelay({ totalUsers, totalDeposits, totalWithdrawals, netInvested: totalInvested, pendingDeposits });
};

export const getInvestmentPackages = () => simulateDelay(db.packages);

export const investInPackage = (userId: string, packageId: string, amount: number) => {
    const user = db.users.find(u => u.id === userId);
    const pkg = db.packages.find(p => p.id === packageId);

    if (!user || !pkg) return Promise.reject('User or Package not found');
    if (user.balance < amount) return Promise.reject('Insufficient balance');
    if (amount < pkg.minInvestment || amount > pkg.maxInvestment) return Promise.reject('Investment amount out of range');

    user.balance -= amount;
    user.investedAmount += amount;
    
    const newInvestment: UserInvestment = { id: `inv-${Date.now()}`, userId, packageId, amount, startDate: new Date() };
    db.userInvestments.push(newInvestment);

    const newTransaction: Transaction = { id: `txn-${Date.now()}`, userId, type: TransactionType.INVESTMENT, status: TransactionStatus.COMPLETED, amount, date: new Date(), details: `Invested in ${pkg.name}`};
    db.transactions.push(newTransaction);

    // Referral bonus logic
    if (user.referredBy) {
        const referrer = db.users.find(u => u.id === user.referredBy);
        const isFirstInvestment = !db.userInvestments.some(inv => inv.userId === userId && inv.id !== newInvestment.id);
        if (referrer && isFirstInvestment) {
            const bonus = amount * 0.05; // 5% referral bonus
            referrer.balance += bonus;
            db.transactions.push({
                id: `txn-ref-${Date.now()}`,
                userId: referrer.id,
                type: TransactionType.REFERRAL_BONUS,
                status: TransactionStatus.COMPLETED,
                amount: bonus,
                date: new Date(),
                details: `Referral bonus from ${user.name}`
            });
        }
    }

    return simulateDelay({ success: true, user });
};

export const requestDeposit = (userId: string, amount: number, proof: string) => {
    const newTransaction: Transaction = {
        id: `txn-${Date.now()}`,
        userId,
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PENDING,
        amount,
        date: new Date(),
        proof
    };
    db.transactions.push(newTransaction);
    return simulateDelay({ success: true, transaction: newTransaction });
};

export const getDepositMethods = () => simulateDelay(db.depositMethods);

// ADMIN Functions
export const addPackage = (pkg: Omit<InvestmentPackage, 'id'>) => {
    const newPackage: InvestmentPackage = { ...pkg, id: `pkg-${Date.now()}` };
    db.packages.push(newPackage);
    return simulateDelay(newPackage);
};

export const deletePackage = (packageId: string) => {
    db.packages = db.packages.filter(p => p.id !== packageId);
    return simulateDelay({ success: true });
};

export const approveDeposit = (transactionId: string) => {
    const transaction = db.transactions.find(t => t.id === transactionId);
    if (!transaction || transaction.type !== TransactionType.DEPOSIT) return Promise.reject('Transaction not found or not a deposit');
    
    const user = db.users.find(u => u.id === transaction.userId);
    if (!user) return Promise.reject('User not found');

    transaction.status = TransactionStatus.COMPLETED;
    user.balance += transaction.amount;

    return simulateDelay({ success: true });
};

export const rejectDeposit = (transactionId: string) => {
    const transaction = db.transactions.find(t => t.id === transactionId);
    if (!transaction) return Promise.reject('Transaction not found');
    transaction.status = TransactionStatus.REJECTED;
    return simulateDelay({ success: true });
};

export const addDepositMethod = (method: Omit<DepositMethod, 'id'>) => {
    const newMethod: DepositMethod = { ...method, id: `dep-${Date.now()}`};
    db.depositMethods.push(newMethod);
    return simulateDelay(newMethod);
};

export const getUsers = () => simulateDelay(db.users);

export const getTransactions = () => simulateDelay(db.transactions);