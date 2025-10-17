export enum UserRole {
    USER = 'USER',
    ADMIN = 'ADMIN'
}

export interface User {
    id: string;
    name: string;
    username: string;
    password: string;
    phoneNumber: string;
    email?: string;
    role: UserRole;
    balance: number;
    profitBalance: number;
    investedAmount: number;
    referralCode: string;
    referredBy?: string;
    createdAt: Date;
    lastWithdrawal?: Date;
}

export interface InvestmentPackage {
    id: string;
    name: string;
    minInvestment: number;
    maxInvestment: number;
    dailyProfitPercent: number;
    durationDays: number;
}

export interface UserInvestment {
    id: string;
    userId: string;
    packageId: string;
    amount: number;
    startDate: Date;
    lastProfitCalculation: Date;
    isActive: boolean;
}

export enum TransactionStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    REJECTED = 'REJECTED'
}

export enum TransactionType {
    DEPOSIT = 'DEPOSIT',
    WITHDRAWAL = 'WITHDRAWAL',
    INVESTMENT = 'INVESTMENT',
    PROFIT = 'PROFIT',
    REFERRAL_BONUS = 'REFERRAL_BONUS'
}

export interface Transaction {
    id: string;
    userId: string;
    type: TransactionType;
    status: TransactionStatus;
    amount: number;
    date: Date;
    proof?: string; 
    details?: string;
    walletAddress?: string;
    depositMethodId?: string;
    withdrawalMethodId?: string;
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

export interface AppData {
    users: User[];
    packages: InvestmentPackage[];
    userInvestments: UserInvestment[];
    transactions: Transaction[];
    depositMethods: DepositMethod[];
    withdrawalMethods: WithdrawalMethod[];
}