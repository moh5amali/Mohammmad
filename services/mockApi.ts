import { User, UserRole, InvestmentPackage, Transaction, TransactionType, TransactionStatus, DepositMethod, WithdrawalMethod, PasswordResetRequest } from '../types';

import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    addDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    limit,
    runTransaction,
    Timestamp,
    writeBatch
} from 'firebase/firestore';

// --- Firebase Configuration ---
// !!! هام: الرجاء استبدال هذا الكائن بمعلومات مشروع Firebase الخاص بك
// يمكنك الحصول عليها من Firebase Console -> Project Settings
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// --- Firebase Initialization ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Collections ---
const usersCol = collection(db, 'users');
const packagesCol = collection(db, 'packages');
const transactionsCol = collection(db, 'transactions');
const depositMethodsCol = collection(db, 'depositMethods');
const withdrawalMethodsCol = collection(db, 'withdrawalMethods');
const passwordResetRequestsCol = collection(db, 'passwordResetRequests');

const FAKE_EMAIL_DOMAIN = 'investmentapp.local';

const convertTimestamps = (data: any) => {
    if (!data) return data;
    const newData = { ...data };
    for (const key in newData) {
        if (newData[key] instanceof Timestamp) {
            newData[key] = (newData[key] as Timestamp).toDate().toISOString();
        } else if (Array.isArray(newData[key])) {
            newData[key] = newData[key].map(item => (typeof item === 'object' && item !== null) ? convertTimestamps(item) : item);
        } else if (typeof newData[key] === 'object' && newData[key] !== null) {
            newData[key] = convertTimestamps(newData[key]);
        }
    }
    return newData;
};

const docToData = (doc: any) => doc.exists() ? convertTimestamps({ id: doc.id, ...doc.data() }) : null;

// --- Auth ---
export const initializeData = () => {}; // No longer needed, Firebase handles this.

export const onAuthChange = (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, async (authUser) => {
        if (authUser) {
            const userDoc = await getDoc(doc(db, 'users', authUser.uid));
            callback(docToData(userDoc));
        } else {
            callback(null);
        }
    });
};

export const register = async (userData: Pick<User, 'username' | 'name' | 'phone' | 'password'>, referredByCode?: string | null): Promise<User> => {
    const email = `${userData.username}@${FAKE_EMAIL_DOMAIN}`;
    const q = query(usersCol, where("username", "==", userData.username));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error('اسم المستخدم مسجل بالفعل.');
    }

    const authUserCredential = await createUserWithEmailAndPassword(auth, email, userData.password!);
    const authUser = authUserCredential.user;

    let referredBy: string | undefined = undefined;
    if (referredByCode) {
        const referrerQuery = query(usersCol, where("referralCode", "==", referredByCode), limit(1));
        const referrerSnapshot = await getDocs(referrerQuery);
        if (!referrerSnapshot.empty) {
            referredBy = referrerSnapshot.docs[0].id;
        }
    }

    const newUser: Omit<User, 'id'> = {
        username: userData.username,
        name: userData.name,
        phone: userData.phone,
        role: (userData.username === 'm' && userData.password === '1029') ? UserRole.ADMIN : UserRole.USER,
        balance: 0,
        profitBalance: 0,
        investedAmount: 0,
        referralCode: userData.username.toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase(),
        referredBy,
        referredUserIds: [],
        activeInvestments: [],
    };

    await setDoc(doc(db, "users", authUser.uid), newUser);

    if (referredBy) {
        const referrerDocRef = doc(db, "users", referredBy);
        const referrerDoc = await getDoc(referrerDocRef);
        if (referrerDoc.exists()) {
            const referrerData = referrerDoc.data();
            const referredUserIds = [...(referrerData.referredUserIds || []), authUser.uid];
            await updateDoc(referrerDocRef, { referredUserIds });
        }
    }
    return { ...newUser, id: authUser.uid };
};

export const login = async (username: string, password?: string): Promise<User> => {
    const email = `${username}@${FAKE_EMAIL_DOMAIN}`;
    const userCredential = await signInWithEmailAndPassword(auth, email, password!);
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    if (!userDoc.exists()) throw new Error('ملف المستخدم غير موجود.');
    return docToData(userDoc);
};

export const logout = async (): Promise<void> => {
    await signOut(auth);
};

export const requestPasswordReset = async (username: string, whatsappNumber: string): Promise<void> => {
    const userQuery = query(usersCol, where("username", "==", username), where("phone", "==", whatsappNumber));
    const userSnapshot = await getDocs(userQuery);

    if (userSnapshot.empty) {
        throw new Error('لم يتم العثور على مستخدم بهذا الاسم ورقم الهاتف.');
    }
    
    const user = userSnapshot.docs[0].data() as User;
    const userDoc = userSnapshot.docs[0];

    const newRequest = {
        userId: userDoc.id,
        username: user.username,
        whatsappNumber,
        status: 'PENDING',
        date: new Date().toISOString(),
        currentPassword: 'Not available with Firebase Auth'
    };
    await addDoc(passwordResetRequestsCol, newRequest);
};

// --- User Facing ---

const calculateDailyProfits = async (user: User) => {
    if (!user || user.activeInvestments.length === 0) {
        return { hasChanges: false, user };
    }

    let updatedUser = { ...user };
    let transactionsToAdd: Omit<Transaction, 'id'>[] = [];
    const now = new Date();
    let lastCalcDate = updatedUser.lastProfitCalculationDate ? new Date(updatedUser.lastProfitCalculationDate) : new Date(Math.min(...user.activeInvestments.map(inv => new Date(inv.startDate).getTime())));
    
    const allPackages = await getInvestmentPackages();

    while (now.getTime() - lastCalcDate.getTime() >= 24 * 60 * 60 * 1000) {
        lastCalcDate = new Date(lastCalcDate.getTime() + 24 * 60 * 60 * 1000);
        let dailyTotalProfit = 0;
        
        for (const investment of updatedUser.activeInvestments) {
            const pkg = allPackages.find(p => p.id === investment.packageId);
            if (pkg) {
                dailyTotalProfit += investment.amount * (pkg.dailyProfitPercent / 100);
            }
        }

        if (dailyTotalProfit > 0) {
            updatedUser.profitBalance += dailyTotalProfit;
            transactionsToAdd.push({
                userId: updatedUser.id,
                type: TransactionType.PROFIT,
                status: TransactionStatus.COMPLETED,
                amount: dailyTotalProfit,
                date: lastCalcDate.toISOString(),
            });
        }
    }
    
    const hasChanges = transactionsToAdd.length > 0;
    if (hasChanges) {
        updatedUser.lastProfitCalculationDate = lastCalcDate.toISOString();
        const batch = writeBatch(db);
        transactionsToAdd.forEach(tx => {
            batch.set(doc(collection(db, 'transactions')), tx);
        });
        batch.update(doc(db, 'users', updatedUser.id), {
            profitBalance: updatedUser.profitBalance,
            lastProfitCalculationDate: updatedUser.lastProfitCalculationDate
        });
        await batch.commit();
    }
    
    return { hasChanges, user: updatedUser };
};

export const getDashboardData = async (userId: string): Promise<{ user: User, transactions: Transaction[] }> => {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) throw new Error("User not found");
    
    let user = docToData(userDoc);
    const profitCheck = await calculateDailyProfits(user);
    if(profitCheck.hasChanges){
        user = profitCheck.user;
    }

    const q = query(transactionsCol, where('userId', '==', userId), orderBy('date', 'desc'), limit(5));
    const querySnapshot = await getDocs(q);
    const transactions = querySnapshot.docs.map(docToData);
    
    return { user, transactions };
};

export const getInvestmentPackages = async (): Promise<InvestmentPackage[]> => {
    const querySnapshot = await getDocs(packagesCol);
    return querySnapshot.docs.map(docToData);
};

export const investInPackage = async (userId: string, packageId: string, amount: number): Promise<void> => {
    const userRef = doc(db, 'users', userId);

    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User not found.");
        const user = userDoc.data() as User;

        if (user.balance < amount) throw new Error("Insufficient balance.");
        if (amount <= 0) throw new Error("Investment amount must be positive.");

        const newBalance = user.balance - amount;
        const newInvestedAmount = user.investedAmount + amount;
        const newActiveInvestments = [
            ...(user.activeInvestments || []),
            { packageId, amount, startDate: new Date().toISOString() }
        ];

        transaction.update(userRef, {
            balance: newBalance,
            investedAmount: newInvestedAmount,
            activeInvestments: newActiveInvestments
        });

        const newTransaction = {
            userId,
            type: TransactionType.INVESTMENT,
            status: TransactionStatus.COMPLETED,
            amount,
            date: new Date().toISOString(),
        };
        transaction.set(doc(transactionsCol), newTransaction);
    });
};

export const getDepositMethods = async (): Promise<DepositMethod[]> => {
    const querySnapshot = await getDocs(depositMethodsCol);
    return querySnapshot.docs.map(docToData);
};

export const requestDeposit = async (userId: string, amount: number, proof: string, methodId: string): Promise<void> => {
    await addDoc(transactionsCol, {
        userId,
        amount,
        proof,
        depositMethodId: methodId,
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PENDING,
        date: new Date().toISOString()
    });
};

export const getWithdrawalMethods = async (): Promise<WithdrawalMethod[]> => {
    const querySnapshot = await getDocs(withdrawalMethodsCol);
    return querySnapshot.docs.map(docToData);
};

export const requestWithdrawal = async (userId: string, amount: number, walletAddress: string, methodId: string): Promise<void> => {
     const userRef = doc(db, 'users', userId);
     await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User not found.");
        const user = userDoc.data() as User;
        
        if (amount < 10) throw new Error("Minimum withdrawal is $10.");
        if (user.profitBalance < amount) throw new Error("Insufficient profit balance.");
        if (user.lastWithdrawal && (new Date().getTime() - new Date(user.lastWithdrawal).getTime()) < 24 * 60 * 60 * 1000) {
            throw new Error("You can only request one withdrawal every 24 hours.");
        }
        
        transaction.update(userRef, { profitBalance: user.profitBalance - amount });
        
        await addDoc(transactionsCol, {
            userId,
            amount,
            walletAddress,
            withdrawalMethodId: methodId,
            type: TransactionType.WITHDRAWAL,
            status: TransactionStatus.PENDING,
            date: new Date().toISOString()
        });
     });
};


// --- Admin Facing ---

export const getAdminDashboardData = async () => {
    const usersSnapshot = await getDocs(query(usersCol, where('role', '==', UserRole.USER)));
    const depositsSnapshot = await getDocs(query(transactionsCol, where('type', '==', TransactionType.DEPOSIT), where('status', '==', TransactionStatus.COMPLETED)));
    const withdrawalsSnapshot = await getDocs(query(transactionsCol, where('type', '==', TransactionType.WITHDRAWAL), where('status', '==', TransactionStatus.COMPLETED)));

    const totalUsers = usersSnapshot.size;
    const totalDeposits = depositsSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
    const totalWithdrawals = withdrawalsSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
    const netInvested = usersSnapshot.docs.reduce((sum, doc) => sum + (doc.data().investedAmount || 0), 0);

    return { totalUsers, totalDeposits, totalWithdrawals, netInvested };
};

export const getUsers = async (): Promise<User[]> => {
    const querySnapshot = await getDocs(usersCol);
    return querySnapshot.docs.map(docToData);
};

export const getTransactions = async (): Promise<Transaction[]> => {
    const q = query(transactionsCol, orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToData);
};

export const getPasswordResetRequests = async (): Promise<PasswordResetRequest[]> => {
    const q = query(passwordResetRequestsCol, where('status', '==', 'PENDING'), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToData);
};

export const resolvePasswordResetRequest = async (requestId: string, newPassword?: string): Promise<void> => {
    const reqRef = doc(db, 'passwordResetRequests', requestId);
    const reqDoc = await getDoc(reqRef);
    if (!reqDoc.exists()) return;

    // Password change must be done manually by admin, as we don't have a secure way to do it here
    // This action now only marks the request as resolved.
    await updateDoc(reqRef, { status: 'RESOLVED' });
};

export const approveDeposit = async (transactionId: string): Promise<void> => {
    const transactionRef = doc(db, 'transactions', transactionId);
    
    await runTransaction(db, async (transaction) => {
        const txDoc = await transaction.get(transactionRef);
        if (!txDoc.exists() || txDoc.data().type !== TransactionType.DEPOSIT) {
            throw new Error("Transaction not found or not a deposit.");
        }

        const txData = txDoc.data() as Transaction;
        const userRef = doc(db, 'users', txData.userId);
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
            throw new Error("User not found.");
        }

        transaction.update(transactionRef, { status: TransactionStatus.COMPLETED });
        const userData = userDoc.data() as User;
        transaction.update(userRef, { balance: userData.balance + txData.amount });

        if (userData.referredBy) {
            const previousDepositsQuery = query(transactionsCol,
                where('userId', '==', txData.userId),
                where('type', '==', TransactionType.DEPOSIT),
                where('status', '==', TransactionStatus.COMPLETED)
            );
            const previousDepositsSnapshot = await getDocs(previousDepositsQuery);
            // If count is 0, this is the first completed deposit (it hasn't been committed yet).
            if (previousDepositsSnapshot.empty) {
                const referrerRef = doc(db, 'users', userData.referredBy);
                const referrerDoc = await transaction.get(referrerRef);
                if (referrerDoc.exists()) {
                    const bonus = txData.amount * 0.05;
                    const referrerData = referrerDoc.data();
                    transaction.update(referrerRef, { profitBalance: referrerData.profitBalance + bonus });

                    const bonusTransaction = {
                        userId: userData.referredBy,
                        type: TransactionType.REFERRAL_BONUS,
                        status: TransactionStatus.COMPLETED,
                        amount: bonus,
                        date: new Date().toISOString(),
                    };
                    transaction.set(doc(transactionsCol), bonusTransaction);
                }
            }
        }
    });
};

export const rejectDeposit = async (transactionId: string): Promise<void> => {
    await updateDoc(doc(db, 'transactions', transactionId), { status: TransactionStatus.REJECTED });
};

export const approveWithdrawal = async (transactionId: string): Promise<void> => {
    const transactionRef = doc(db, 'transactions', transactionId);
    const txDoc = await getDoc(transactionRef);
    if (!txDoc.exists()) throw new Error("Transaction not found.");

    const userId = txDoc.data().userId;
    const userRef = doc(db, 'users', userId);

    const batch = writeBatch(db);
    batch.update(transactionRef, { status: TransactionStatus.COMPLETED });
    batch.update(userRef, { lastWithdrawal: new Date().toISOString() });
    await batch.commit();
};

export const rejectWithdrawal = async (transactionId: string): Promise<void> => {
    await runTransaction(db, async (transaction) => {
        const txRef = doc(db, 'transactions', transactionId);
        const txDoc = await transaction.get(txRef);
        if (!txDoc.exists()) throw new Error("Transaction not found.");

        const txData = txDoc.data() as Transaction;
        const userRef = doc(db, 'users', txData.userId);
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User not found.");

        const userData = userDoc.data();
        transaction.update(txRef, { status: TransactionStatus.REJECTED });
        transaction.update(userRef, { profitBalance: userData.profitBalance + txData.amount });
    });
};

export const addPackage = async (pkg: Omit<InvestmentPackage, 'id'>): Promise<void> => {
    await addDoc(packagesCol, pkg);
};

export const updatePackage = async (id: string, data: Omit<InvestmentPackage, 'id'>): Promise<void> => {
    await updateDoc(doc(db, 'packages', id), data);
};

export const deletePackage = async (packageId: string): Promise<void> => {
    await deleteDoc(doc(db, 'packages', packageId));
};

export const addDepositMethod = async (method: Omit<DepositMethod, 'id'>): Promise<void> => {
    await addDoc(depositMethodsCol, method);
};

export const updateDepositMethod = async (id: string, data: Omit<DepositMethod, 'id'>): Promise<void> => {
    await updateDoc(doc(db, 'depositMethods', id), data);
};

export const deleteDepositMethod = async (methodId: string): Promise<void> => {
    await deleteDoc(doc(db, 'depositMethods', methodId));
};

export const addWithdrawalMethod = async (method: Omit<WithdrawalMethod, 'id'>): Promise<void> => {
    await addDoc(withdrawalMethodsCol, method);
};

export const updateWithdrawalMethod = async (id: string, data: Omit<WithdrawalMethod, 'id'>): Promise<void> => {
    await updateDoc(doc(db, 'withdrawalMethods', id), data);
};

export const deleteWithdrawalMethod = async (methodId: string): Promise<void> => {
    await deleteDoc(doc(db, 'withdrawalMethods', methodId));
};