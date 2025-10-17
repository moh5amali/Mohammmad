import { User, UserRole, InvestmentPackage, Transaction, TransactionType, TransactionStatus, DepositMethod, WithdrawalMethod, PasswordResetRequest } from '../types';

// Utility to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 11);

const DB_KEY = 'investmentAppDB';
const LOGGED_IN_USER_ID_KEY = 'loggedInUserId';

interface AppDB {
    users: User[];
    packages: InvestmentPackage[];
    transactions: Transaction[];
    depositMethods: DepositMethod[];
    withdrawalMethods: WithdrawalMethod[];
    passwordResetRequests: PasswordResetRequest[];
}

const getDefaultData = (): AppDB => {
    const user1Id = 'user-1';
    const user2Id = 'user-2';
    const adminId = 'admin-1';
    
    return {
        users: [
            { id: adminId, username: 'm', name: 'Admin', email: 'admin@example.com', password: '1029', role: UserRole.ADMIN, balance: 0, profitBalance: 0, investedAmount: 0, referralCode: 'ADMINREF', isEmailVerified: true },
            { id: user1Id, username: 'ahmedali', name: 'أحمد علي', email: 'user1@example.com', password: 'password123', phone: '123456789', role: UserRole.USER, balance: 1500, profitBalance: 250, investedAmount: 1000, referralCode: 'AHMED123', isEmailVerified: true },
            { id: user2Id, username: 'fatima', name: 'فاطمة الزهراء', email: 'user2@example.com', password: 'password123', phone: '987654321', role: UserRole.USER, balance: 200, profitBalance: 50, investedAmount: 500, referralCode: 'FATIMA456', referredBy: user1Id, isEmailVerified: true },
        ],
        packages: [
            { id: 'pkg-1', name: 'الباقة البرونزية', minInvestment: 100, maxInvestment: 999, dailyProfitPercent: 5, durationDays: 30 },
            { id: 'pkg-2', name: 'الباقة الفضية', minInvestment: 1000, maxInvestment: 4999, dailyProfitPercent: 7, durationDays: 45 },
            { id: 'pkg-3', name: 'الباقة الذهبية', minInvestment: 5000, maxInvestment: 20000, dailyProfitPercent: 10, durationDays: 60 },
        ],
        transactions: [
            { id: generateId(), userId: user1Id, type: TransactionType.DEPOSIT, status: TransactionStatus.COMPLETED, amount: 1000, date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), depositMethodId: 'dm-1' },
            { id: generateId(), userId: user1Id, type: TransactionType.INVESTMENT, status: TransactionStatus.COMPLETED, amount: 1000, date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
            { id: generateId(), userId: user1Id, type: TransactionType.PROFIT, status: TransactionStatus.COMPLETED, amount: 250, date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
             { id: generateId(), userId: user2Id, type: TransactionType.DEPOSIT, status: TransactionStatus.PENDING, amount: 500, date: new Date().toISOString(), depositMethodId: 'dm-1', proof: 'https://via.placeholder.com/300' },
            { id: generateId(), userId: user1Id, type: TransactionType.WITHDRAWAL, status: TransactionStatus.PENDING, amount: 100, date: new Date().toISOString(), withdrawalMethodId: 'wm-1', walletAddress: 'TABC123XYZ' },
        ],
        depositMethods: [
            { id: 'dm-1', name: 'USDT (TRC20)', address: 'TX7d5sA1c2B3d4E5f6G7h8I9j0K1l2M3n4o' },
        ],
        withdrawalMethods: [
            { id: 'wm-1', name: 'USDT (TRC20)'},
            { id: 'wm-2', name: 'Bank Transfer'},
        ],
        passwordResetRequests: [
             { id: generateId(), userId: user2Id, username: 'fatima', email: 'user2@example.com', whatsappNumber: '9876543210', status: 'PENDING', date: new Date().toISOString() }
        ]
    };
};

let DB: AppDB;

const loadDB = () => {
    let dbData: AppDB;
    try {
        const data = localStorage.getItem(DB_KEY);
        dbData = data ? JSON.parse(data) : getDefaultData();
    } catch (e) {
        console.error("Failed to load DB from localStorage, using defaults.", e);
        dbData = getDefaultData();
    }

    // --- FIX START ---
    // Ensure admin user always exists and has the correct password.
    const adminUsername = 'm';
    const adminPassword = '1029';
    let adminUser = dbData.users.find(u => u.username === adminUsername && u.role === UserRole.ADMIN);

    let needsSave = false;
    if (adminUser) {
        // Admin exists, make sure password is correct
        if (adminUser.password !== adminPassword) {
            adminUser.password = adminPassword;
            needsSave = true;
            console.log('Admin password has been corrected.');
        }
    } else {
        // Admin does not exist, so let's add them from the defaults.
        const defaultAdmin = getDefaultData().users.find(u => u.username === adminUsername);
        if (defaultAdmin) {
            dbData.users.push(defaultAdmin);
            needsSave = true;
            console.log('Admin user has been re-created.');
        }
    }
    
    DB = dbData; 

    if (needsSave) {
        saveDB(); 
    }
    // --- FIX END ---
};

const saveDB = () => {
    try {
        if (DB) {
            localStorage.setItem(DB_KEY, JSON.stringify(DB));
        }
    } catch (e) {
        console.error("Failed to save DB to localStorage", e);
    }
};

loadDB();

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// --- Auth ---

export const initializeData = () => {
    if (!localStorage.getItem(DB_KEY)) {
        saveDB();
    }
}

export const register = async (userData: Pick<User, 'username' | 'name' | 'email' | 'phone' | 'password'>): Promise<User> => {
    await delay(500);
    if (DB.users.some(u => u.email === userData.email)) throw new Error('البريد الإلكتروني مسجل بالفعل.');
    if (DB.users.some(u => u.username === userData.username)) throw new Error('اسم المستخدم مسجل بالفعل.');

    const newUser: User = {
        id: generateId(),
        role: UserRole.USER,
        balance: 0,
        profitBalance: 0,
        investedAmount: 0,
        referralCode: userData.username.toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase(),
        isEmailVerified: true, // Auto-verify users
        ...userData,
    };
    
    DB.users.push(newUser);
    saveDB();
    return newUser;
};

export const login = async (usernameOrEmail: string, password?: string): Promise<User> => {
    await delay(500);
    const user = DB.users.find(u => (u.username === usernameOrEmail || u.email === usernameOrEmail) && u.password === password);
    if (!user) throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة.');
    
    setLoggedInUser(user.id);
    return user;
};

export const requestPasswordReset = async (usernameOrEmail: string, whatsappNumber: string): Promise<void> => {
    await delay(500);
    const user = DB.users.find(u => u.username === usernameOrEmail || u.email === usernameOrEmail);
    if (!user) {
        // Don't throw an error for security, but we can log it for debug
        console.log(`Password reset request for non-existent user: ${usernameOrEmail}`);
        return;
    }
    
    const newRequest: PasswordResetRequest = {
        id: generateId(),
        userId: user.id,
        username: user.username,
        email: user.email,
        whatsappNumber,
        status: 'PENDING',
        date: new Date().toISOString()
    };
    
    DB.passwordResetRequests.unshift(newRequest);
    saveDB();
};

export const setLoggedInUser = (userId: string) => {
    localStorage.setItem(LOGGED_IN_USER_ID_KEY, userId);
};

export const logout = () => {
    localStorage.removeItem(LOGGED_IN_USER_ID_KEY);
};

export const getLoggedInUser = (): User | null => {
    const userId = localStorage.getItem(LOGGED_IN_USER_ID_KEY);
    if (!userId) return null;
    return DB.users.find(u => u.id === userId) || null;
};


// --- User Facing ---

export const getDashboardData = async (userId: string): Promise<{ user: User, transactions: Transaction[] }> => {
    await delay(300);
    const user = DB.users.find(u => u.id === userId);
    if (!user) throw new Error("User not found");
    const transactions = DB.transactions
        .filter(t => t.userId === userId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
    return { user, transactions };
};

export const getInvestmentPackages = async (): Promise<InvestmentPackage[]> => {
    await delay(200);
    return [...DB.packages];
};

export const investInPackage = async (userId: string, packageId: string, amount: number): Promise<void> => {
    await delay(500);
    const user = DB.users.find(u => u.id === userId);
    const pkg = DB.packages.find(p => p.id === packageId);
    if (!user || !pkg) throw new Error("User or Package not found.");
    if (amount < pkg.minInvestment || amount > pkg.maxInvestment) throw new Error(`Investment amount must be between $${pkg.minInvestment} and $${pkg.maxInvestment}.`);
    if (user.balance < amount) throw new Error("Insufficient balance.");
    
    user.balance -= amount;
    user.investedAmount += amount;
    DB.transactions.unshift({
        id: generateId(),
        userId,
        type: TransactionType.INVESTMENT,
        status: TransactionStatus.COMPLETED,
        amount,
        date: new Date().toISOString(),
    });
    
    if (user.referredBy) {
        const referrer = DB.users.find(u => u.id === user.referredBy);
        if (referrer && DB.transactions.filter(t => t.userId === userId && t.type === TransactionType.INVESTMENT).length === 1) {
             const bonus = amount * 0.05;
             referrer.profitBalance += bonus;
             DB.transactions.unshift({
                id: generateId(),
                userId: referrer.id,
                type: TransactionType.REFERRAL_BONUS,
                status: TransactionStatus.COMPLETED,
                amount: bonus,
                date: new Date().toISOString(),
             });
        }
    }

    saveDB();
};

export const getDepositMethods = async (): Promise<DepositMethod[]> => {
    await delay(100);
    return [...DB.depositMethods];
};

export const requestDeposit = async (userId: string, amount: number, proof: string, methodId: string): Promise<void> => {
    await delay(500);
    DB.transactions.unshift({
        id: generateId(),
        userId,
        amount,
        proof,
        depositMethodId: methodId,
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PENDING,
        date: new Date().toISOString()
    });
    saveDB();
};

export const getWithdrawalMethods = async (): Promise<WithdrawalMethod[]> => {
    await delay(100);
    return [...DB.withdrawalMethods];
};

export const requestWithdrawal = async (userId: string, amount: number, walletAddress: string, methodId: string): Promise<void> => {
    await delay(500);
    const user = DB.users.find(u => u.id === userId);
    if (!user) throw new Error("User not found.");
    if (amount < 10) throw new Error("Minimum withdrawal is $10.");
    if (user.profitBalance < amount) throw new Error("Insufficient profit balance.");
    if (user.lastWithdrawal && (new Date().getTime() - new Date(user.lastWithdrawal).getTime()) < 24 * 60 * 60 * 1000) {
        throw new Error("You can only request one withdrawal every 24 hours.");
    }
    
    user.profitBalance -= amount;
    DB.transactions.unshift({
        id: generateId(),
        userId,
        amount,
        walletAddress,
        withdrawalMethodId: methodId,
        type: TransactionType.WITHDRAWAL,
        status: TransactionStatus.PENDING,
        date: new Date().toISOString()
    });
    saveDB();
};


// --- Admin Facing ---

export const getAdminDashboardData = async () => {
    await delay(400);
    const totalUsers = DB.users.filter(u => u.role === UserRole.USER).length;
    const totalDeposits = DB.transactions.filter(t => t.type === TransactionType.DEPOSIT && t.status === TransactionStatus.COMPLETED).reduce((sum, t) => sum + t.amount, 0);
    const totalWithdrawals = DB.transactions.filter(t => t.type === TransactionType.WITHDRAWAL && t.status === TransactionStatus.COMPLETED).reduce((sum, t) => sum + t.amount, 0);
    const netInvested = DB.users.reduce((sum, u) => sum + u.investedAmount, 0);
    return { totalUsers, totalDeposits, totalWithdrawals, netInvested };
};

export const getUsers = async (): Promise<User[]> => {
    await delay(100);
    return [...DB.users];
};

export const getTransactions = async (): Promise<Transaction[]> => {
    await delay(200);
    return [...DB.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getPasswordResetRequests = async (): Promise<PasswordResetRequest[]> => {
    await delay(200);
    return [...DB.passwordResetRequests]
        .filter(r => r.status === 'PENDING')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const resolvePasswordResetRequest = async (requestId: string): Promise<void> => {
    await delay(300);
    const request = DB.passwordResetRequests.find(r => r.id === requestId);
    if (request) {
        request.status = 'RESOLVED';
        saveDB();
    }
};


export const approveDeposit = async (transactionId: string): Promise<void> => {
    await delay(300);
    const transaction = DB.transactions.find(t => t.id === transactionId);
    if (!transaction || transaction.type !== TransactionType.DEPOSIT) throw new Error("Transaction not found or not a deposit.");
    const user = DB.users.find(u => u.id === transaction.userId);
    if (!user) throw new Error("User not found.");

    transaction.status = TransactionStatus.COMPLETED;
    user.balance += transaction.amount;
    saveDB();
};

export const rejectDeposit = async (transactionId: string): Promise<void> => {
    await delay(300);
    const transaction = DB.transactions.find(t => t.id === transactionId);
    if (!transaction) throw new Error("Transaction not found.");
    transaction.status = TransactionStatus.REJECTED;
    saveDB();
};

export const approveWithdrawal = async (transactionId: string): Promise<void> => {
    await delay(300);
    const transaction = DB.transactions.find(t => t.id === transactionId);
    if (!transaction || transaction.type !== TransactionType.WITHDRAWAL) throw new Error("Transaction not found or not a withdrawal.");
    const user = DB.users.find(u => u.id === transaction.userId);
    if (!user) throw new Error("User not found.");
    
    transaction.status = TransactionStatus.COMPLETED;
    user.lastWithdrawal = new Date().toISOString();
    saveDB();
};

export const rejectWithdrawal = async (transactionId: string): Promise<void> => {
    await delay(300);
    const transaction = DB.transactions.find(t => t.id === transactionId);
    if (!transaction) throw new Error("Transaction not found.");
    const user = DB.users.find(u => u.id === transaction.userId);
    if (!user) throw new Error("User not found.");
    
    transaction.status = TransactionStatus.REJECTED;
    // Refund the amount to user's profit balance
    user.profitBalance += transaction.amount;
    saveDB();
};

export const addPackage = async (pkg: Omit<InvestmentPackage, 'id'>): Promise<void> => {
    await delay(200);
    DB.packages.push({ ...pkg, id: generateId() });
    saveDB();
};

export const deletePackage = async (packageId: string): Promise<void> => {
    await delay(200);
    DB.packages = DB.packages.filter(p => p.id !== packageId);
    saveDB();
};

export const addDepositMethod = async (method: Omit<DepositMethod, 'id'>): Promise<void> => {
    await delay(200);
    DB.depositMethods.push({ ...method, id: generateId() });
    saveDB();
};

export const deleteDepositMethod = async (methodId: string): Promise<void> => {
    await delay(200);
    DB.depositMethods = DB.depositMethods.filter(m => m.id !== methodId);
    saveDB();
};

export const addWithdrawalMethod = async (method: Omit<WithdrawalMethod, 'id'>): Promise<void> => {
    await delay(200);
    DB.withdrawalMethods.push({ ...method, id: generateId() });
    saveDB();
};

export const deleteWithdrawalMethod = async (methodId: string): Promise<void> => {
    await delay(200);
    DB.withdrawalMethods = DB.withdrawalMethods.filter(m => m.id !== methodId);
    saveDB();
};