export type FinanceGroup =
  | 'kuppam_committee'
  | 'district_committee'
  | 'finance_handler'
  | 'bank'
  | 'cash_box'
  | 'landowner';

export type FinanceTransactionType =
  | 'collection_allocation' // Initial allocation from fundraising collections
  | 'transfer'              // Transfer between custodians / accounts
  | 'expense'               // Project expense
  | 'landowner_payment';    // Payment to landowner

export type ExpenseCategory =
  | 'printing'
  | 'documentation'
  | 'land_related'
  | 'travel'
  | 'office'
  | 'other';

export interface FinanceAccount {
  id: string;
  name: string;
  group: FinanceGroup;
  holderName?: string;
  holderPhone?: string;
  accountNumber?: string; // For bank accounts
  bankName?: string;
  openingBalancePaise: number;
  currentBalancePaise: number;
  totalReceivedPaise: number;
  totalTransferredOutPaise: number;
  totalExpensesPaidPaise: number;
  notes?: string;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface FinanceTransaction {
  id: string;
  transactionNumber: string; // e.g. FT-2026-0001
  transactionType: FinanceTransactionType;
  fromAccountId?: string;
  fromAccountName?: string;
  toAccountId?: string;
  toAccountName?: string;
  amountPaise: number;
  date: string; // YYYY-MM-DD
  category?: ExpenseCategory | string;
  expenseTitle?: string;
  paidToRecipient?: string; // Recipient vendor, shop, or landowner
  referenceNumber?: string; // Bank UTR, Cheque No, Receipt Ref
  notes?: string;
  attachmentUrl?: string; // Optional bill or receipt link
  createdByUid: string;
  createdByName: string;
  status: 'completed' | 'cancelled';
  cancelledAt?: any;
  cancelledByUid?: string;
  cancelledByName?: string;
  cancellationReason?: string;
  createdAt: any;
}

export interface FinanceOverviewSummary {
  totalCollectedPaise: number;          // Total from verified fundraising collections
  totalAvailablePaise: number;          // Current available in all active custodians
  totalPaidToLandownerPaise: number;    // Cumulative landowner payments
  totalDistrictFundsPaise: number;      // Current balance in District Committee accounts/handlers
  totalKuppamFundsPaise: number;        // Current balance in Kuppam Committee accounts/handlers
  totalExpensesPaise: number;           // Cumulative project expenses
  totalHeldByIndividualsPaise: number;  // Current balance held by individual handlers
  totalInBankOrCashPaise: number;       // Current balance in bank accounts or cash boxes
  accountsCount: number;
  transactionsCount: number;
}

