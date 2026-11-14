export type FinanceSourceType = 'district' | 'kuppam_main' | 'handler';

export type FinanceRecordType = 'handover' | 'expense' | 'landowner_payment';

export interface KuppamHandler {
  id: string;
  name: string;
  phone?: string;
  role?: string; // e.g. "കൺവീനർ", "ട്രഷറർ", "ബാങ്ക് അക്കൗണ്ട്"
  notes?: string;
  isActive: boolean;
  createdAt?: any;
}

export interface FinanceRecord {
  id: string;
  recordNumber: string; // e.g. REC-2026-001
  type: FinanceRecordType;
  amountPaise: number;
  sourceType: FinanceSourceType;
  sourceHandlerId?: string;
  sourceHandlerName?: string;
  targetHandlerId?: string;   // For handovers
  targetHandlerName?: string; // For handovers
  title: string;              // e.g. "പോസ്റ്റർ പ്രിന്റിംഗ്", "മൻസൂർക്കയ്ക്ക് ഏൽപ്പിച്ചത്"
  category?: string;          // printing, documentation, travel, office, other
  date: string;               // YYYY-MM-DD
  notes?: string;
  recipient?: string;         // Whom was it paid to
  status: 'active' | 'cancelled';
  cancellationReason?: string;
  createdByUid: string;
  createdByName: string;
  createdAt?: any;
  updatedByUid?: string;
  updatedByName?: string;
  updatedAt?: any;
}

export interface FinanceLiveSummary {
  // Live collections auto-synced from cashCollections
  totalCollectedPaise: number;
  districtCollectedPaise: number;
  kuppamCollectedPaise: number;

  // Expenses & payments
  districtExpensesPaise: number;
  districtLandownerPaise: number;
  districtBalancePaise: number;

  kuppamTotalHandedOverPaise: number;
  kuppamExpensesPaise: number;
  kuppamLandownerPaise: number;
  kuppamMainBalancePaise: number;
  kuppamTotalAvailablePaise: number;

  totalExpensesPaise: number;
  totalLandownerPaidPaise: number;
  overallNetBalancePaise: number;
}
