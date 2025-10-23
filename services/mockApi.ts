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
    const adminId = 'admin-1';
    
    return {
        users: [
            { 
                id: adminId, 
                username: 'm', 
                name: 'Admin', 
                password: '1029', 
                role: UserRole.ADMIN, 
                balance: 0, 
                profitBalance: 0, 
                investedAmount: 0, 
                referralCode: 'ADMINREF', 
                referredUserIds: [], 
                activeInvestments: [] 
            },
        ],
        packages: [],
        transactions: [],
        depositMethods: [],
        withdrawalMethods: [],
        passwordResetRequests: []
    };
};

let DB: AppDB;

const saveDB = () => {
    try {
        if (DB) {
            localStorage.setItem(DB_KEY, JSON.stringify(DB));
        }
    } catch (e) {
        console.error("Failed to save DB to localStorage", e);
    }
};

const readDBFromStorage = () => {
    try {
        const data = localStorage.getItem(DB_KEY);
        if (data) {
            DB = JSON.parse(data);
        }
    } catch (e) {
        console.error("Failed to read DB from storage", e);
    }
};

const loadDB = () => {
    let dbData: AppDB;
    try {
        const data = localStorage.getItem(DB_KEY);
        dbData = data ? JSON.parse(data) : getDefaultData();
    } catch (e) {
        console.error("Failed to load DB from localStorage, using defaults.", e);
        dbData = getDefaultData();
    }
    
    if (!dbData.passwordResetRequests) dbData.passwordResetRequests = [];
    if (!dbData.users.every(u => u.activeInvestments)) {
         dbData.users.forEach(u => u.activeInvestments = u.activeInvestments || []);
    }
     if (!dbData.users.every(u => u.referredUserIds)) {
         dbData.users.forEach(u => u.referredUserIds = u.referredUserIds || []);
    }

    const adminUsername = 'm';
    const adminPassword = '1029';
    let adminUser = dbData.users.find(u => u.username === adminUsername && u.role === UserRole.ADMIN);

    let needsSave = false;
    if (adminUser) {
        if (adminUser.password !== adminPassword) {
            adminUser.password = adminPassword;
            needsSave = true;
        }
    } else {
        const defaultAdmin = getDefaultData().users.find(u => u.username === adminUsername);
        if (defaultAdmin) {
            dbData.users.push(defaultAdmin);
            needsSave = true;
        }
    }
    
    DB = dbData; 

    if (needsSave || !localStorage.getItem(DB_KEY)) {
        saveDB(); 
    }
};

loadDB();

// --- Auth ---

export const initializeData = () => {
    // This is now handled by the initial loadDB call.
};

export const register = async (userData: Pick<User, 'username' | 'name' | 'phone' | 'password'>, referredByCode?: string | null): Promise<User> => {
    readDBFromStorage();
    if (DB.users.some(u => u.username === userData.username)) throw new Error('اسم المستخدم مسجل بالفعل.');

    let referredBy: string | undefined = undefined;
    if (referredByCode) {
        const referrer = DB.users.find(u => u.referralCode === referredByCode);
        if (referrer) {
            referredBy = referrer.id;
        }
    }

    const newUser: User = {
        id: generateId(),
        role: UserRole.USER,
        balance: 0,
        profitBalance: 0,
        investedAmount: 0,
        referralCode: userData.username.toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase(),
        ...userData,
        referredBy,
        referredUserIds: [],
        activeInvestments: [],
    };
    
    DB.users.push(newUser);

    if (referredBy) {
        const referrer = DB.users.find(u => u.id === referredBy);
        if (referrer) {
            referrer.referredUserIds.push(newUser.id);
        }
    }
    saveDB();
    return newUser;
};

export const login = async (username: string, password?: string): Promise<User> => {
    readDBFromStorage();
    const user = DB.users.find(u => u.username === username && u.password === password);
    if (!user) throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة.');
    
    setLoggedInUser(user.id);
    return user;
};

export const requestPasswordReset = async (username: string, whatsappNumber: string): Promise<void> => {
    readDBFromStorage();
    const user = DB.users.find(u => u.username === username && u.phone === whatsappNumber);
    if (!user) {
        throw new Error('لم يتم العثور على مستخدم بهذا الاسم ورقم الهاتف.');
    }
    
    const newRequest: PasswordResetRequest = {
        id: generateId(),
        userId: user.id,
        username: user.username,
        whatsappNumber,
        status: 'PENDING',
        date: new Date().toISOString(),
        currentPassword: user.password,
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
    readDBFromStorage();
    const userId = localStorage.getItem(LOGGED_IN_USER_ID_KEY);
    if (!userId) return null;
    return DB.users.find(u => u.id === userId) || null;
};

const calculateDailyProfits = (user: User) => {
    if (user.activeInvestments.length > 0) {
        const now = new Date().getTime();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        
        const firstInvestmentDate = Math.min(...user.activeInvestments.map(inv => new Date(inv.startDate).getTime()));
        let lastCalcTime = user.lastProfitCalculationDate ? new Date(user.lastProfitCalculationDate).getTime() : firstInvestmentDate;

        let profitsWereAdded = false;
        
        while (now - lastCalcTime >= twentyFourHours) {
            let dailyTotalProfit = 0;
            const profitDay = new Date(lastCalcTime + twentyFourHours);
            
            for (const investment of user.activeInvestments) {
                const investmentStartTime = new Date(investment.startDate).getTime();
                if (investmentStartTime < profitDay.getTime()) {
                    const pkg = DB.packages.find(p => p.id === investment.packageId);
                    if (pkg) {
                        dailyTotalProfit += investment.amount * (pkg.dailyProfitPercent / 100);
                    }
                }
            }

            if (dailyTotalProfit > 0) {
                 user.profitBalance += dailyTotalProfit;
                 DB.transactions.unshift({
                    id: generateId(),
                    userId: user.id,
                    type: TransactionType.PROFIT,
                    status: TransactionStatus.COMPLETED,
                    amount: dailyTotalProfit,
                    date: profitDay.toISOString(),
                });
                profitsWereAdded = true;
            }
            lastCalcTime += twentyFourHours;
        }

        if (profitsWereAdded) {
            user.lastProfitCalculationDate = new Date(lastCalcTime).toISOString();
        }
    }
};

// --- User Facing ---

export const getDashboardData = async (userId: string): Promise<{ user: User, transactions: Transaction[] }> => {
    readDBFromStorage();
    const user = DB.users.find(u => u.id === userId);
    if (!user) throw new Error("User not found");
    
    calculateDailyProfits(user);
    saveDB(); // Save unconditionally after potential profit calculations

    const transactions = DB.transactions
        .filter(t => t.userId === userId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
    return { user, transactions };
};

export const getInvestmentPackages = async (): Promise<InvestmentPackage[]> => {
    readDBFromStorage();
    return [...DB.packages];
};

export const investInPackage = async (userId: string, packageId: string, amount: number): Promise<void> => {
    readDBFromStorage();
    const user = DB.users.find(u => u.id === userId);
    const pkg = DB.packages.find(p => p.id === packageId);
    if (!user || !pkg) throw new Error("User or Package not found.");
    if (user.balance < amount) throw new Error("Insufficient balance.");
    if (amount <= 0) throw new Error("Investment amount must be positive.");
    
    user.balance -= amount;
    user.investedAmount += amount;
    user.activeInvestments.push({
        packageId,
        amount,
        startDate: new Date().toISOString()
    });

    DB.transactions.unshift({
        id: generateId(),
        userId,
        type: TransactionType.INVESTMENT,
        status: TransactionStatus.COMPLETED,
        amount,
        date: new Date().toISOString(),
    });
    
    saveDB();
};

export const getDepositMethods = async (): Promise<DepositMethod[]> => {
    readDBFromStorage();
    return [...DB.depositMethods];
};

export const requestDeposit = async (userId: string, amount: number, proof: string, methodId: string): Promise<void> => {
    readDBFromStorage();
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
    readDBFromStorage();
    return [...DB.withdrawalMethods];
};

export const requestWithdrawal = async (userId: string, amount: number, walletAddress: string, methodId: string): Promise<void> => {
    readDBFromStorage();
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
    readDBFromStorage();
    const totalUsers = DB.users.filter(u => u.role === UserRole.USER).length;
    const totalDeposits = DB.transactions.filter(t => t.type === TransactionType.DEPOSIT && t.status === TransactionStatus.COMPLETED).reduce((sum, t) => sum + t.amount, 0);
    const totalWithdrawals = DB.transactions.filter(t => t.type === TransactionType.WITHDRAWAL && t.status === TransactionStatus.COMPLETED).reduce((sum, t) => sum + t.amount, 0);
    const netInvested = DB.users.reduce((sum, u) => u.activeInvestments.reduce((invSum, inv) => invSum + inv.amount, 0), 0);
    return { totalUsers, totalDeposits, totalWithdrawals, netInvested };
};

export const getUsers = async (): Promise<User[]> => {
    readDBFromStorage();
    return [...DB.users];
};

export const getTransactions = async (): Promise<Transaction[]> => {
    readDBFromStorage();
    return [...DB.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getPasswordResetRequests = async (): Promise<PasswordResetRequest[]> => {
    readDBFromStorage();
    return [...DB.passwordResetRequests]
        .filter(r => r.status === 'PENDING')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const resolvePasswordResetRequest = async (requestId: string, newPassword?: string): Promise<void> => {
    readDBFromStorage();
    const request = DB.passwordResetRequests.find(r => r.id === requestId);
    if (request) {
        if (newPassword && newPassword.trim() !== '') {
            const user = DB.users.find(u => u.id === request.userId);
            if (user) {
                user.password = newPassword.trim();
            }
        }
        request.status = 'RESOLVED';
        saveDB();
    }
};

export const approveDeposit = async (transactionId: string): Promise<void> => {
    readDBFromStorage();
    const transaction = DB.transactions.find(t => t.id === transactionId);
    if (!transaction || transaction.type !== TransactionType.DEPOSIT) throw new Error("Transaction not found or not a deposit.");
    const user = DB.users.find(u => u.id === transaction.userId);
    if (!user) throw new Error("User not found.");

    transaction.status = TransactionStatus.COMPLETED;
    user.balance += transaction.amount;

    if (user.referredBy) {
        const referrer = DB.users.find(u => u.id === user.referredBy);
        const hasPreviousCompletedDeposits = DB.transactions.some(
            t => t.userId === user.id && 
                 t.type === TransactionType.DEPOSIT && 
                 t.status === TransactionStatus.COMPLETED && 
                 t.id !== transactionId
        );

        if (referrer && !hasPreviousCompletedDeposits) {
             const bonus = transaction.amount * 0.05;
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

export const rejectDeposit = async (transactionId: string): Promise<void> => {
    readDBFromStorage();
    const transaction = DB.transactions.find(t => t.id === transactionId);
    if (!transaction) throw new Error("Transaction not found.");
    transaction.status = TransactionStatus.REJECTED;
    saveDB();
};

export const approveWithdrawal = async (transactionId: string): Promise<void> => {
    readDBFromStorage();
    const transaction = DB.transactions.find(t => t.id === transactionId);
    if (!transaction || transaction.type !== TransactionType.WITHDRAWAL) throw new Error("Transaction not found or not a withdrawal.");
    const user = DB.users.find(u => u.id === transaction.userId);
    if (!user) throw new Error("User not found.");
    
    transaction.status = TransactionStatus.COMPLETED;
    user.lastWithdrawal = new Date().toISOString();
    saveDB();
};

export const rejectWithdrawal = async (transactionId: string): Promise<void> => {
    readDBFromStorage();
    const transaction = DB.transactions.find(t => t.id === transactionId);
    if (!transaction) throw new Error("Transaction not found.");
    const user = DB.users.find(u => u.id === transaction.userId);
    if (!user) throw new Error("User not found.");
    
    transaction.status = TransactionStatus.REJECTED;
    user.profitBalance += transaction.amount;
    saveDB();
};

export const addPackage = async (pkg: Omit<InvestmentPackage, 'id'>): Promise<void> => {
    readDBFromStorage();
    DB.packages.push({ ...pkg, id: generateId() });
    saveDB();
};

export const updatePackage = async (id: string, data: Omit<InvestmentPackage, 'id'>): Promise<void> => {
    readDBFromStorage();
    const pkg = DB.packages.find(p => p.id === id);
    if (pkg) {
        pkg.name = data.name;
        pkg.price = data.price;
        pkg.dailyProfitPercent = data.dailyProfitPercent;
        saveDB();
    }
};

export const deletePackage = async (packageId: string): Promise<void> => {
    readDBFromStorage();
    DB.packages = DB.packages.filter(p => p.id !== packageId);
    saveDB();
};

export const addDepositMethod = async (method: Omit<DepositMethod, 'id'>): Promise<void> => {
    readDBFromStorage();
    DB.depositMethods.push({ ...method, id: generateId() });
    saveDB();
};

export const updateDepositMethod = async (id: string, data: Omit<DepositMethod, 'id'>): Promise<void> => {
    readDBFromStorage();
    const method = DB.depositMethods.find(m => m.id === id);
    if (method) {
        method.name = data.name;
        method.address = data.address;
        saveDB();
    }
};

export const deleteDepositMethod = async (methodId: string): Promise<void> => {
    readDBFromStorage();
    DB.depositMethods = DB.depositMethods.filter(m => m.id !== methodId);
    saveDB();
};

export const addWithdrawalMethod = async (method: Omit<WithdrawalMethod, 'id'>): Promise<void> => {
    readDBFromStorage();
    DB.withdrawalMethods.push({ ...method, id: generateId() });
    saveDB();
};

export const updateWithdrawalMethod = async (id: string, data: Omit<WithdrawalMethod, 'id'>): Promise<void> => {
    readDBFromStorage();
    const method = DB.withdrawalMethods.find(m => m.id === id);
    if (method) {
        method.name = data.name;
        saveDB();
    }
};

export const deleteWithdrawalMethod = async (methodId: string): Promise<void> => {
    readDBFromStorage();
    DB.withdrawalMethods = DB.withdrawalMethods.filter(m => m.id !== methodId);
    saveDB();
};
