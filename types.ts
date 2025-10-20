export enum UserRole {
    USER = 'USER',
    ADMIN = 'ADMIN',
}

export enum TransactionType {
    DEPOSIT = 'DEPOSIT',
    WITHDRAWAL = 'WITHDRAWAL',
    INVESTMENT = 'INVESTMENT',
    PROFIT = 'PROFIT',
    REFERRAL_BONUS = 'REFERRAL_BONUS',
}

export enum TransactionStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    REJECTED = 'REJECTED',
}

export interface User {
    id: string;
    username: string;
    name: string;
    phone?: string;
    password?: string;
    role: UserRole;
    balance: number;
    profitBalance: number;
    investedAmount: number;
    referralCode: string;
    referredBy?: string;
    lastWithdrawal?: string;
    referredUserIds: string[];
    activeInvestments: {
        packageId: string;
        amount: number;
        startDate: string;
    }[];
    lastProfitCalculationDate?: string;
}

export interface InvestmentPackage {
    id: string;
    name: string;
    price: number;
    dailyProfitPercent: number;
}

export interface Transaction {
    id: string;
    userId: string;
    type: TransactionType;
    status: TransactionStatus;
    amount: number;
    date: string; // ISO string
    proof?: string; // base64 image data
    depositMethodId?: string;
    withdrawalMethodId?: string;
    walletAddress?: string;
}

export interface DepositMethod {
    id: string;
    name: string;
    address: string;
}

export interface WithdrawalMethod {
    id: string;
    name: string;
}

export interface PasswordResetRequest {
    id: string;
    userId: string;
    username: string;
    whatsappNumber: string;
    status: 'PENDING' | 'RESOLVED';
    date: string; // ISO string
    currentPassword?: string;
}