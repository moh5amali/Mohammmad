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
    email: string;
    phone?: string;
    password?: string;
    role: UserRole;
    balance: number;
    profitBalance: number;
    investedAmount: number;
    referralCode: string;
    referredBy?: string;
    lastWithdrawal?: string;
    
    isEmailVerified: boolean;
    verificationToken?: string;
    verificationTokenExpires?: string; // ISO string
    passwordResetToken?: string;
    passwordResetTokenExpires?: string; // ISO string
}

export interface InvestmentPackage {
    id: string;
    name: string;
    minInvestment: number;
    maxInvestment: number;
    dailyProfitPercent: number;
    durationDays: number;
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