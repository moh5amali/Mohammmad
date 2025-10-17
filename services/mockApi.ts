import { AppData, User, InvestmentPackage, Transaction, TransactionStatus, TransactionType, UserInvestment, DepositMethod, WithdrawalMethod, UserRole } from '../types';

const DB_KEY = 'investment_app_db';

const getDefaultData = (): AppData => ({
    users: [
        { id: 'user-1', name: 'Alice', username: 'alice', password: 'password123', phoneNumber: '555-0101', role: UserRole.USER, balance: 1500, profitBalance: 150, investedAmount: 500, referralCode: 'ALICE123', createdAt: new Date('2023-10-01') },
        { id: 'user-2', name: 'Bob', username: 'bob', password: 'password123', phoneNumber: '555-0102', role: UserRole.USER, balance: 200, profitBalance: 20, investedAmount: 1000, referralCode: 'BOB456', referredBy: 'user-1', createdAt: new Date('2023-10-05') },
        { id: 'admin-1', name: 'Admin', username: 'm', password: '1029', phoneNumber: '555-0100', role: UserRole.ADMIN, balance: 0, profitBalance: 0, investedAmount: 0, referralCode: 'ADMIN789', createdAt: new Date('2023-09-01') },
    ],
    packages: [
        { id: 'pkg-1', name: 'Starter Plan', minInvestment: 100, maxInvestment: 999, dailyProfitPercent: 10, durationDays: 30 },
        { id: 'pkg-2', name: 'Pro Plan', minInvestment: 1000, maxInvestment: 4999, dailyProfitPercent: 10, durationDays: 60 },
        { id: 'pkg-3', name: 'VIP Plan', minInvestment: 5000, maxInvestment: 10000, dailyProfitPercent: 10, durationDays: 90 },
    ],
    userInvestments: [
        { id: 'inv-1', userId: 'user-1', packageId: 'pkg-1', amount: 500, startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), lastProfitCalculation: new Date(Date.now() - 24 * 60 * 60 * 1000), isActive: true },
        { id: 'inv-2', userId: 'user-2', packageId: 'pkg-2', amount: 1000, startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), lastProfitCalculation: new Date(Date.now() - 24 * 60 * 60 * 1000), isActive: true },
    ],
    transactions: [
        { id: 'txn-1', userId: 'user-1', type: TransactionType.DEPOSIT, status: TransactionStatus.COMPLETED, amount: 2000, date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), depositMethodId: 'dep-1' },
        { id: 'txn-2', userId: 'user-2', type: TransactionType.DEPOSIT, status: TransactionStatus.PENDING, amount: 500, date: new Date(), proof: 'https://picsum.photos/400/300', depositMethodId: 'dep-1' },
    ],
    depositMethods: [
        { id: 'dep-1', name: 'USDT (TRC20)', address: 'TXYZ...ABC' },
    ],
    withdrawalMethods: [
        { id: 'wd-1', name: 'USDT (TRC20)' },
    ],
});

const loadDb = (): AppData => {
    try {
        const data = localStorage.getItem(DB_KEY);
        if (data) {
            const parsedData = JSON.parse(data);
            // Dates are stored as strings, need to parse them back
            parsedData.users.forEach((u: User) => {
                u.createdAt = new Date(u.createdAt);
                if (u.lastWithdrawal) u.lastWithdrawal = new Date(u.lastWithdrawal);
            });
            parsedData.userInvestments.forEach((i: UserInvestment) => {
                i.startDate = new Date(i.startDate);
                i.lastProfitCalculation = new Date(i.lastProfitCalculation);
            });
            parsedData.transactions.forEach((t: Transaction) => t.date = new Date(t.date));
            return parsedData;
        }
    } catch (error) {
        console.error("Failed to load data from localStorage", error);
    }
    const defaultData = getDefaultData();
    saveDb(defaultData);
    return defaultData;
};

const saveDb = (db: AppData) => {
    try {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (error) {
        console.error("Failed to save data to localStorage", error);
    }
};

let db = loadDb();

const simulateDelay = <T,>(data: T): Promise<T> => new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(data))), 300));


// --- Auth Functions ---
export const login = (username: string, password: string): Promise<User> => {
    const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (user) {
        sessionStorage.setItem('loggedInUserId', user.id);
        return simulateDelay(user);
    }
    return Promise.reject('اسم المستخدم أو كلمة المرور غير صحيحة');
};

export const register = (name: string, username: string, password: string, phoneNumber: string): Promise<User> => {
    if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        return Promise.reject('اسم المستخدم موجود بالفعل');
    }
    const newUser: User = {
        id: `user-${Date.now()}`,
        name,
        username,
        password,
        phoneNumber,
        role: UserRole.USER,
        balance: 0,
        profitBalance: 0,
        investedAmount: 0,
        referralCode: `${username.toUpperCase()}${Math.floor(100 + Math.random() * 900)}`,
        createdAt: new Date(),
    };
    db.users.push(newUser);
    saveDb(db);
    sessionStorage.setItem('loggedInUserId', newUser.id);
    return simulateDelay(newUser);
};

export const logout = () => {
    sessionStorage.removeItem('loggedInUserId');
    return Promise.resolve();
};

export const getLoggedInUser = (): User | null => {
    const userId = sessionStorage.getItem('loggedInUserId');
    if (!userId) return null;
    const user = db.users.find(u => u.id === userId);
    return user ? { ...user } : null;
};

// --- Profit Calculation ---
const calculateProfitsForUser = (userId: string) => {
    const user = db.users.find(u => u.id === userId);
    if (!user) return;

    const investments = db.userInvestments.filter(inv => inv.userId === userId && inv.isActive);
    const now = new Date();

    investments.forEach(inv => {
        const pkg = db.packages.find(p => p.id === inv.packageId);
        if (!pkg) return;

        const investmentEndDate = new Date(new Date(inv.startDate).getTime() + pkg.durationDays * 24 * 60 * 60 * 1000);
        const calculationEndDate = now > investmentEndDate ? investmentEndDate : now;
        
        const hoursSinceLastCalc = (calculationEndDate.getTime() - new Date(inv.lastProfitCalculation).getTime()) / (1000 * 3600);
        const periodsPassed = Math.floor(hoursSinceLastCalc / 24);

        if (periodsPassed > 0) {
            const profitAmount = periodsPassed * inv.amount * (pkg.dailyProfitPercent / 100);
            user.balance += profitAmount;
            user.profitBalance += profitAmount;
            inv.lastProfitCalculation = new Date(new Date(inv.lastProfitCalculation).getTime() + periodsPassed * 24 * 60 * 60 * 1000);

            db.transactions.push({
                id: `txn-profit-${Date.now()}`,
                userId,
                type: TransactionType.PROFIT,
                status: TransactionStatus.COMPLETED,
                amount: profitAmount,
                date: new Date(),
                details: `Daily profit for ${pkg.name}`
            });
        }

        // Check if investment is completed
        if (now >= investmentEndDate) {
            inv.isActive = false;
            user.balance += inv.amount;
            user.investedAmount -= inv.amount;
        }
    });

    saveDb(db);
};


// --- API Functions ---
export const getDashboardData = (userId: string) => {
    calculateProfitsForUser(userId);
    const user = db.users.find(u => u.id === userId);
    if (!user) return Promise.reject('User not found');

    const transactions = db.transactions.filter(t => t.userId === userId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return simulateDelay({ user, transactions: transactions.slice(0, 5) });
};

export const getAdminDashboardData = () => {
    const totalUsers = db.users.filter(u => u.role === UserRole.USER).length;
    const totalDeposits = db.transactions.filter(t => t.type === TransactionType.DEPOSIT && t.status === TransactionStatus.COMPLETED).reduce((sum, t) => sum + t.amount, 0);
    const totalWithdrawals = db.transactions.filter(t => t.type === TransactionType.WITHDRAWAL && t.status === TransactionStatus.COMPLETED).reduce((sum, t) => sum + t.amount, 0);
    const totalInvested = db.userInvestments.reduce((sum, inv) => sum + inv.amount, 0);
    return simulateDelay({ totalUsers, totalDeposits, totalWithdrawals, netInvested: totalInvested });
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
    
    const newInvestment: UserInvestment = { id: `inv-${Date.now()}`, userId, packageId, amount, startDate: new Date(), lastProfitCalculation: new Date(), isActive: true };
    db.userInvestments.push(newInvestment);

    const newTransaction: Transaction = { id: `txn-${Date.now()}`, userId, type: TransactionType.INVESTMENT, status: TransactionStatus.COMPLETED, amount, date: new Date(), details: `Invested in ${pkg.name}`};
    db.transactions.push(newTransaction);

    if (user.referredBy) {
      // Referral logic...
    }
    
    saveDb(db);
    return simulateDelay({ success: true, user });
};

export const requestDeposit = (userId: string, amount: number, proof: string, depositMethodId: string) => {
    const newTransaction: Transaction = {
        id: `txn-${Date.now()}`,
        userId,
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PENDING,
        amount,
        date: new Date(),
        proof,
        depositMethodId,
    };
    db.transactions.push(newTransaction);
    saveDb(db);
    return simulateDelay({ success: true, transaction: newTransaction });
};

export const requestWithdrawal = (userId: string, amount: number, walletAddress: string, withdrawalMethodId: string) => {
    const user = db.users.find(u => u.id === userId);
    if (!user) return Promise.reject('User not found');
    if (amount < 10) return Promise.reject('الحد الأدنى للسحب هو 10$');
    if (user.profitBalance < amount) return Promise.reject('رصيد الأرباح غير كافٍ');

    const now = new Date();
    if (user.lastWithdrawal) {
        const hoursSinceLast = (now.getTime() - new Date(user.lastWithdrawal).getTime()) / (1000 * 3600);
        if (hoursSinceLast < 24) return Promise.reject('يمكنك طلب السحب مرة واحدة كل 24 ساعة');
    }

    const newTransaction: Transaction = {
        id: `txn-wd-${Date.now()}`,
        userId,
        type: TransactionType.WITHDRAWAL,
        status: TransactionStatus.PENDING,
        amount,
        date: now,
        walletAddress,
        withdrawalMethodId,
    };
    db.transactions.push(newTransaction);
    user.lastWithdrawal = now;
    saveDb(db);
    return simulateDelay({ success: true });
};


export const getDepositMethods = () => simulateDelay(db.depositMethods);
export const getWithdrawalMethods = () => simulateDelay(db.withdrawalMethods);

// ADMIN Functions
export const addPackage = (pkg: Omit<InvestmentPackage, 'id'>) => {
    const newPackage: InvestmentPackage = { ...pkg, id: `pkg-${Date.now()}` };
    db.packages.push(newPackage);
    saveDb(db);
    return simulateDelay(newPackage);
};

export const deletePackage = (packageId: string) => {
    db.packages = db.packages.filter(p => p.id !== packageId);
    saveDb(db);
    return simulateDelay({ success: true });
};

export const approveDeposit = (transactionId: string) => {
    const transaction = db.transactions.find(t => t.id === transactionId);
    if (!transaction || transaction.type !== TransactionType.DEPOSIT) return Promise.reject('Transaction not found or not a deposit');
    
    const user = db.users.find(u => u.id === transaction.userId);
    if (!user) return Promise.reject('User not found');

    transaction.status = TransactionStatus.COMPLETED;
    user.balance += transaction.amount;
    saveDb(db);
    return simulateDelay({ success: true });
};

export const rejectDeposit = (transactionId: string) => {
    const transaction = db.transactions.find(t => t.id === transactionId);
    if (!transaction) return Promise.reject('Transaction not found');
    transaction.status = TransactionStatus.REJECTED;
    saveDb(db);
    return simulateDelay({ success: true });
};

export const approveWithdrawal = (transactionId: string) => {
    const transaction = db.transactions.find(t => t.id === transactionId);
    if (!transaction || transaction.type !== TransactionType.WITHDRAWAL) return Promise.reject('Transaction not found or not a withdrawal');

    const user = db.users.find(u => u.id === transaction.userId);
    if (!user) return Promise.reject('User not found');

    if (user.balance < transaction.amount || user.profitBalance < transaction.amount) {
        transaction.status = TransactionStatus.REJECTED;
        transaction.details = "Insufficient funds at time of approval.";
        saveDb(db);
        return Promise.reject("Insufficient funds");
    }

    transaction.status = TransactionStatus.COMPLETED;
    user.balance -= transaction.amount;
    user.profitBalance -= transaction.amount;
    saveDb(db);
    return simulateDelay({ success: true });
};

export const rejectWithdrawal = (transactionId: string) => {
    const transaction = db.transactions.find(t => t.id === transactionId);
    if (!transaction) return Promise.reject('Transaction not found');
    transaction.status = TransactionStatus.REJECTED;
    // Note: We don't refund any amount or reset cooldown as no money was moved.
    saveDb(db);
    return simulateDelay({ success: true });
};


export const addDepositMethod = (method: Omit<DepositMethod, 'id'>) => {
    const newMethod: DepositMethod = { ...method, id: `dep-${Date.now()}`};
    db.depositMethods.push(newMethod);
    saveDb(db);
    return simulateDelay(newMethod);
};

export const deleteDepositMethod = (methodId: string) => {
    db.depositMethods = db.depositMethods.filter(m => m.id !== methodId);
    saveDb(db);
    return simulateDelay({ success: true });
};

export const addWithdrawalMethod = (method: Omit<WithdrawalMethod, 'id'>) => {
    const newMethod: WithdrawalMethod = { ...method, id: `wd-${Date.now()}` };
    db.withdrawalMethods.push(newMethod);
    saveDb(db);
    return simulateDelay(newMethod);
};

export const deleteWithdrawalMethod = (methodId: string) => {
    db.withdrawalMethods = db.withdrawalMethods.filter(m => m.id !== methodId);
    saveDb(db);
    return simulateDelay({ success: true });
};


export const getUsers = () => simulateDelay(db.users);

export const getTransactions = () => simulateDelay(db.transactions);