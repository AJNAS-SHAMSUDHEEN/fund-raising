'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Landmark,
  Wallet,
  ArrowRightLeft,
  ReceiptText,
  Building2,
  Users,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Filter,
  Download,
  Printer,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  FileText,
  DollarSign,
  TrendingDown,
  TrendingUp,
  MapPin,
  Clock,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useAdminAuth } from '@/lib/state/adminAuth';
import { formatINR, formatINRFromPaise } from '@/lib/calculations/currency';
import {
  FinanceAccount,
  FinanceTransaction,
  FinanceGroup,
  ExpenseCategory,
  FinanceOverviewSummary,
} from '@/lib/types/finance';
import {
  subscribeToFinanceAccounts,
  subscribeToFinanceTransactions,
  createFinanceAccount,
  recordMoneyTransfer,
  recordExpense,
  recordLandownerPayment,
  cancelFinanceTransaction,
  seedDefaultFinanceAccountsIfEmpty,
} from '@/lib/firebase/finance';
import { subscribeToCampaignAggregates } from '@/lib/firebase/db';

export default function FinanceManagementPage() {
  const { adminUser } = useAdminAuth();

  // Data states
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [totalFundraisingVerifiedPaise, setTotalFundraisingVerifiedPaise] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'transfers' | 'expenses' | 'landowner' | 'history'>('overview');

  // Filter States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modals state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isLandownerModalOpen, setIsLandownerModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [cancelModalTxn, setCancelModalTxn] = useState<FinanceTransaction | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Form states
  const [transferForm, setTransferForm] = useState({
    fromAccountId: '',
    toAccountId: '',
    amountRupees: '',
    date: new Date().toISOString().split('T')[0],
    purpose: '',
    referenceNumber: '',
    notes: '',
  });

  const [expenseForm, setExpenseForm] = useState({
    fromAccountId: '',
    amountRupees: '',
    category: 'printing' as ExpenseCategory,
    expenseTitle: '',
    paidToRecipient: '',
    date: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    notes: '',
  });

  const [landownerForm, setLandownerForm] = useState({
    fromAccountId: '',
    landownerAccountId: '',
    amountRupees: '',
    paidToRecipient: 'ഭൂവുടമ (Landowner)',
    date: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    notes: '',
  });

  const [accountForm, setAccountForm] = useState({
    name: '',
    group: 'kuppam_committee' as FinanceGroup,
    holderName: '',
    holderPhone: '',
    accountNumber: '',
    bankName: '',
    openingBalanceRupees: '0',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // 1. Initial Subscriptions
  useEffect(() => {
    // Seed default accounts if empty
    seedDefaultFinanceAccountsIfEmpty();

    // Subscribe to accounts
    const unsubAccounts = subscribeToFinanceAccounts((accList) => {
      setAccounts(accList);
      setIsLoading(false);
    });

    // Subscribe to transactions
    const unsubTxns = subscribeToFinanceTransactions((txnList) => {
      setTransactions(txnList);
    });

    // Subscribe to fundraising campaign aggregates for authoritative collection total
    const unsubAgg = subscribeToCampaignAggregates((agg) => {
      if (agg?.totalVerifiedPaise) {
        setTotalFundraisingVerifiedPaise(agg.totalVerifiedPaise);
      }
    });

    return () => {
      unsubAccounts();
      unsubTxns();
      unsubAgg();
    };
  }, []);

  // 2. Calculations for Financial Overview
  const summary: FinanceOverviewSummary = useMemo(() => {
    // Total expenses from completed transactions
    const totalExpensesPaise = transactions
      .filter((t) => t.transactionType === 'expense' && t.status !== 'cancelled')
      .reduce((sum, t) => sum + (t.amountPaise || 0), 0);

    // Total paid to landowner from completed transactions
    const totalPaidToLandownerPaise = transactions
      .filter((t) => t.transactionType === 'landowner_payment' && t.status !== 'cancelled')
      .reduce((sum, t) => sum + (t.amountPaise || 0), 0);

    // Filter active accounts excluding pure landowner sink
    const activeCustodianAccounts = accounts.filter(
      (a) => a.isActive && a.group !== 'landowner'
    );

    // Total available currently held across all custodians
    const totalAvailablePaise = activeCustodianAccounts.reduce(
      (sum, a) => sum + (a.currentBalancePaise || 0),
      0
    );

    // District Committee Funds
    const totalDistrictFundsPaise = accounts
      .filter((a) => a.isActive && a.group === 'district_committee')
      .reduce((sum, a) => sum + (a.currentBalancePaise || 0), 0);

    // Kuppam Committee Funds (Kuppam committee group + bank + cash_box)
    const totalKuppamFundsPaise = accounts
      .filter(
        (a) =>
          a.isActive &&
          (a.group === 'kuppam_committee' || a.group === 'bank' || a.group === 'cash_box')
      )
      .reduce((sum, a) => sum + (a.currentBalancePaise || 0), 0);

    // Held by individual finance handlers
    const totalHeldByIndividualsPaise = accounts
      .filter((a) => a.isActive && a.group === 'finance_handler')
      .reduce((sum, a) => sum + (a.currentBalancePaise || 0), 0);

    // In Bank or Physical Cash Custody
    const totalInBankOrCashPaise = accounts
      .filter((a) => a.isActive && (a.group === 'bank' || a.group === 'cash_box'))
      .reduce((sum, a) => sum + (a.currentBalancePaise || 0), 0);

    return {
      totalCollectedPaise: totalFundraisingVerifiedPaise,
      totalAvailablePaise,
      totalPaidToLandownerPaise,
      totalDistrictFundsPaise,
      totalKuppamFundsPaise,
      totalExpensesPaise,
      totalHeldByIndividualsPaise,
      totalInBankOrCashPaise,
      accountsCount: accounts.length,
      transactionsCount: transactions.length,
    };
  }, [accounts, transactions, totalFundraisingVerifiedPaise]);

  // 3. Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) => {
      // Type filter
      if (filterType !== 'all' && txn.transactionType !== filterType) {
        return false;
      }

      // Account filter
      if (filterAccount !== 'all') {
        if (txn.fromAccountId !== filterAccount && txn.toAccountId !== filterAccount) {
          return false;
        }
      }

      // Date Range filter
      if (startDate && txn.date < startDate) return false;
      if (endDate && txn.date > endDate) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesDesc = (txn.expenseTitle || '').toLowerCase().includes(term);
        const matchesRef = (txn.referenceNumber || '').toLowerCase().includes(term);
        const matchesFrom = (txn.fromAccountName || '').toLowerCase().includes(term);
        const matchesTo = (txn.toAccountName || '').toLowerCase().includes(term);
        const matchesRecipient = (txn.paidToRecipient || '').toLowerCase().includes(term);
        const matchesNotes = (txn.notes || '').toLowerCase().includes(term);
        const matchesTxnNo = (txn.transactionNumber || '').toLowerCase().includes(term);

        if (!matchesDesc && !matchesRef && !matchesFrom && !matchesTo && !matchesRecipient && !matchesNotes && !matchesTxnNo) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, filterType, filterAccount, startDate, endDate, searchTerm]);

  // 4. Form Submissions
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const amt = parseFloat(transferForm.amountRupees);
    if (!amt || amt <= 0) {
      setFormError('Please enter a valid amount.');
      return;
    }
    if (!transferForm.fromAccountId || !transferForm.toAccountId) {
      setFormError('Please select both sender and receiver accounts.');
      return;
    }

    setIsSubmitting(true);
    const res = await recordMoneyTransfer({
      fromAccountId: transferForm.fromAccountId,
      toAccountId: transferForm.toAccountId,
      amountPaise: Math.round(amt * 100),
      date: transferForm.date,
      purpose: transferForm.purpose.trim() || 'Fund Transfer',
      referenceNumber: transferForm.referenceNumber,
      notes: transferForm.notes,
      createdByUid: adminUser?.uid || 'admin',
      createdByName: adminUser?.name || 'Administrator',
    });
    setIsSubmitting(false);

    if (res.success) {
      setFormSuccess('Money transfer recorded successfully!');
      setTransferForm({
        fromAccountId: '',
        toAccountId: '',
        amountRupees: '',
        date: new Date().toISOString().split('T')[0],
        purpose: '',
        referenceNumber: '',
        notes: '',
      });
      setTimeout(() => {
        setIsTransferModalOpen(false);
        setFormSuccess('');
      }, 1200);
    } else {
      setFormError(res.error || 'Transfer failed.');
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const amt = parseFloat(expenseForm.amountRupees);
    if (!amt || amt <= 0) {
      setFormError('Please enter a valid amount.');
      return;
    }
    if (!expenseForm.fromAccountId) {
      setFormError('Please select which account paid for this expense.');
      return;
    }
    if (!expenseForm.expenseTitle.trim()) {
      setFormError('Please enter expense title / description.');
      return;
    }

    setIsSubmitting(true);
    const res = await recordExpense({
      fromAccountId: expenseForm.fromAccountId,
      amountPaise: Math.round(amt * 100),
      category: expenseForm.category,
      expenseTitle: expenseForm.expenseTitle,
      paidToRecipient: expenseForm.paidToRecipient || 'Vendor / Shop',
      date: expenseForm.date,
      referenceNumber: expenseForm.referenceNumber,
      notes: expenseForm.notes,
      createdByUid: adminUser?.uid || 'admin',
      createdByName: adminUser?.name || 'Administrator',
    });
    setIsSubmitting(false);

    if (res.success) {
      setFormSuccess('Expense recorded successfully!');
      setExpenseForm({
        fromAccountId: '',
        amountRupees: '',
        category: 'printing',
        expenseTitle: '',
        paidToRecipient: '',
        date: new Date().toISOString().split('T')[0],
        referenceNumber: '',
        notes: '',
      });
      setTimeout(() => {
        setIsExpenseModalOpen(false);
        setFormSuccess('');
      }, 1200);
    } else {
      setFormError(res.error || 'Failed to record expense.');
    }
  };

  const handleLandownerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const amt = parseFloat(landownerForm.amountRupees);
    if (!amt || amt <= 0) {
      setFormError('Please enter a valid amount.');
      return;
    }
    if (!landownerForm.fromAccountId) {
      setFormError('Please select source account (paid from).');
      return;
    }

    setIsSubmitting(true);
    const res = await recordLandownerPayment({
      fromAccountId: landownerForm.fromAccountId,
      landownerAccountId: landownerForm.landownerAccountId || undefined,
      amountPaise: Math.round(amt * 100),
      date: landownerForm.date,
      paidToRecipient: landownerForm.paidToRecipient.trim() || 'ഭൂവുടമ (Landowner)',
      referenceNumber: landownerForm.referenceNumber,
      notes: landownerForm.notes,
      createdByUid: adminUser?.uid || 'admin',
      createdByName: adminUser?.name || 'Administrator',
    });
    setIsSubmitting(false);

    if (res.success) {
      setFormSuccess('Landowner payment recorded successfully!');
      setLandownerForm({
        fromAccountId: '',
        landownerAccountId: '',
        amountRupees: '',
        paidToRecipient: 'ഭൂവുടമ (Landowner)',
        date: new Date().toISOString().split('T')[0],
        referenceNumber: '',
        notes: '',
      });
      setTimeout(() => {
        setIsLandownerModalOpen(false);
        setFormSuccess('');
      }, 1200);
    } else {
      setFormError(res.error || 'Payment recording failed.');
    }
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!accountForm.name.trim()) {
      setFormError('Please enter an account name.');
      return;
    }

    const openingPaise = Math.round((parseFloat(accountForm.openingBalanceRupees) || 0) * 100);

    setIsSubmitting(true);
    try {
      await createFinanceAccount({
        name: accountForm.name,
        group: accountForm.group,
        holderName: accountForm.holderName,
        holderPhone: accountForm.holderPhone,
        accountNumber: accountForm.accountNumber,
        bankName: accountForm.bankName,
        openingBalancePaise: openingPaise,
        notes: accountForm.notes,
      });

      setFormSuccess('New custodian account created!');
      setAccountForm({
        name: '',
        group: 'kuppam_committee',
        holderName: '',
        holderPhone: '',
        accountNumber: '',
        bankName: '',
        openingBalanceRupees: '0',
        notes: '',
      });
      setTimeout(() => {
        setIsAccountModalOpen(false);
        setFormSuccess('');
      }, 1200);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelTransaction = async () => {
    if (!cancelModalTxn) return;
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancelling this transaction.');
      return;
    }

    setIsSubmitting(true);
    const res = await cancelFinanceTransaction({
      transactionId: cancelModalTxn.id,
      cancellationReason: cancelReason,
      cancelledByUid: adminUser?.uid || 'admin',
      cancelledByName: adminUser?.name || 'Administrator',
    });
    setIsSubmitting(false);

    if (res.success) {
      setCancelModalTxn(null);
      setCancelReason('');
    } else {
      alert(res.error || 'Cancellation failed.');
    }
  };

  // Helper Labels
  const getGroupName = (group: FinanceGroup) => {
    switch (group) {
      case 'kuppam_committee':
        return 'കുപ്പം കമ്മിറ്റി ഫണ്ട് (Kuppam Committee)';
      case 'district_committee':
        return 'ജില്ലാ കമ്മിറ്റി ഫണ്ട് (District Committee)';
      case 'finance_handler':
        return 'വ്യക്തികളുടെ കൈവശമുള്ളത് (Finance Handler)';
      case 'bank':
        return 'ബാങ്ക് അക്കൗണ്ട് (Bank Account)';
      case 'cash_box':
        return 'കാഷ് കസ്റ്റഡി (Cash in Hand)';
      case 'landowner':
        return 'ഭൂവുടമ (Landowner)';
      default:
        return group;
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'printing':
        return 'പ്രിന്റിംഗ് (Printing)';
      case 'documentation':
        return 'ഡോക്യുമെന്റേഷൻ & ലീഗൽ';
      case 'land_related':
        return 'ഭൂമി സംബന്ധം (Land)';
      case 'travel':
        return 'യാത്രാ ചിലവ് (Travel)';
      case 'office':
        return 'ഓഫീസ് / സ്റ്റേജ് ചിലവുകൾ';
      default:
        return cat || 'മറ്റുള്ളവ (Other)';
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '60px' }}>

      {/* Top Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#064E3B',
              color: '#FDE68A',
            }}>
              <Landmark size={18} />
            </span>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--brand-900)', margin: 0 }}>
              Finance Management (ധനകാര്യ നിർവ്വഹണം)
            </h1>
          </div>
          <p style={{ fontSize: '0.88rem', color: '#64748B', margin: 0 }}>
            Track money custody, committee fund allocations, landowner payments, and project expenses.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              setFormError('');
              setFormSuccess('');
              setIsTransferModalOpen(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '10px',
              border: 'none',
              background: '#047857',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(4, 120, 87, 0.25)',
            }}
          >
            <ArrowRightLeft size={16} />
            <span>Add Transfer (പണം കൈമാറ്റം)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFormError('');
              setFormSuccess('');
              setIsExpenseModalOpen(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '10px',
              border: 'none',
              background: '#E11D48',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(225, 29, 72, 0.25)',
            }}
          >
            <TrendingDown size={16} />
            <span>Add Expense (ചിലവ്)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFormError('');
              setFormSuccess('');
              setIsLandownerModalOpen(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '10px',
              border: 'none',
              background: '#D97706',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(217, 119, 6, 0.25)',
            }}
          >
            <Building2 size={16} />
            <span>Pay Landowner (ഭൂവുടമയ്ക്ക്)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFormError('');
              setFormSuccess('');
              setIsAccountModalOpen(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#334155',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            <span>Add Custodian</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 12px',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#334155',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
            }}
          >
            <Printer size={16} />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION A: 8 SUMMARY KPI CARDS                           */}
      {/* ======================================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '14px',
        marginBottom: '28px',
      }}>
        {/* 1. Total Fundraising Collected */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '18px 20px',
          border: '1px solid #E2E8F0',
          borderTop: '4px solid #10B981',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            1. Total Amount Collected
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 900, color: '#065F46', lineHeight: 1.1 }}>
            {formatINRFromPaise(summary.totalCollectedPaise)}
          </div>
          <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '6px' }}>
            Verified fundraising collection
          </div>
        </div>

        {/* 2. Total Currently Available */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '18px 20px',
          border: '1px solid #E2E8F0',
          borderTop: '4px solid #047857',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            2. Total Currently Available
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 900, color: '#047857', lineHeight: 1.1 }}>
            {formatINRFromPaise(summary.totalAvailablePaise)}
          </div>
          <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '6px' }}>
            Available balance across all holders
          </div>
        </div>

        {/* 3. Paid to Landowner */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '18px 20px',
          border: '1px solid #E2E8F0',
          borderTop: '4px solid #D97706',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            3. Paid to Landowner
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 900, color: '#B45309', lineHeight: 1.1 }}>
            {formatINRFromPaise(summary.totalPaidToLandownerPaise)}
          </div>
          <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '6px' }}>
            ഭൂവുടമയ്ക്ക് കൈമാറിയ ആകെ തുക
          </div>
        </div>

        {/* 4. District Committee Funds */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '18px 20px',
          border: '1px solid #E2E8F0',
          borderTop: '4px solid #4F46E5',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            4. District Committee Funds
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 900, color: '#3730A3', lineHeight: 1.1 }}>
            {formatINRFromPaise(summary.totalDistrictFundsPaise)}
          </div>
          <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '6px' }}>
            Current balance with District Committee
          </div>
        </div>

        {/* 5. Kuppam Committee Funds */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '18px 20px',
          border: '1px solid #E2E8F0',
          borderTop: '4px solid #0284C7',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            5. Kuppam Committee Funds
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 900, color: '#0369A1', lineHeight: 1.1 }}>
            {formatINRFromPaise(summary.totalKuppamFundsPaise)}
          </div>
          <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '6px' }}>
            Bank + Cash Box + Unit accounts
          </div>
        </div>

        {/* 6. Total Expenses */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '18px 20px',
          border: '1px solid #E2E8F0',
          borderTop: '4px solid #E11D48',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            6. Total Expenses
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 900, color: '#BE123C', lineHeight: 1.1 }}>
            {formatINRFromPaise(summary.totalExpensesPaise)}
          </div>
          <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '6px' }}>
            Printing, legal &amp; project expenses
          </div>
        </div>

        {/* 7. Held by Individuals */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '18px 20px',
          border: '1px solid #E2E8F0',
          borderTop: '4px solid #8B5CF6',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            7. Held by Individuals
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 900, color: '#6D28D9', lineHeight: 1.1 }}>
            {formatINRFromPaise(summary.totalHeldByIndividualsPaise)}
          </div>
          <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '6px' }}>
            വ്യക്തികൾ സൂക്ഷിക്കുന്ന തുക
          </div>
        </div>

        {/* 8. Bank or Cash Custody */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '18px 20px',
          border: '1px solid #E2E8F0',
          borderTop: '4px solid #0D9488',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            8. Bank &amp; Cash Custody
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 900, color: '#0F766E', lineHeight: 1.1 }}>
            {formatINRFromPaise(summary.totalInBankOrCashPaise)}
          </div>
          <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '6px' }}>
            ബാങ്കിലും കാഷ് പെട്ടിയിലുമുള്ള തുക
          </div>
        </div>
      </div>

      {/* Navigation View Tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        borderBottom: '1px solid #E2E8F0',
        marginBottom: '20px',
        overflowX: 'auto',
      }}>
        {[
          { id: 'overview', label: 'Overview & Distribution' },
          { id: 'accounts', label: `Custodians & Accounts (${accounts.length})` },
          { id: 'transfers', label: 'Money Transfers' },
          { id: 'expenses', label: 'Expenses' },
          { id: 'landowner', label: 'Landowner Payments' },
          { id: 'history', label: `All Transactions (${transactions.length})` },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '10px 16px',
                fontSize: '0.88rem',
                fontWeight: 700,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: isActive ? '#065F46' : '#64748B',
                borderBottom: isActive ? '3px solid #065F46' : '3px solid transparent',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: OVERVIEW & TWO MAJOR COMMITTEES DISTRIBUTION       */}
      {/* ======================================================== */}
      {(activeTab === 'overview' || activeTab === 'accounts') && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '20px',
            marginBottom: '24px',
          }}>
            {/* Group 1: District Committee Funds */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '24px',
              border: '1.5px solid #E0E7FF',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={20} color="#4F46E5" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E1B4B', margin: 0 }}>
                    1. District Committee Funds (ജില്ലാ കമ്മിറ്റി)
                  </h3>
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: '#EEF2FF', color: '#4338CA' }}>
                  District Group
                </span>
              </div>

              <div style={{
                background: '#F5F3FF',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <span style={{ fontSize: '0.78rem', color: '#6B7280', fontWeight: 600 }}>Current Balance with District:</span>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, color: '#3730A3' }}>
                  {formatINRFromPaise(summary.totalDistrictFundsPaise)}
                </div>
              </div>

              <div style={{ fontSize: '0.84rem', color: '#475569', marginBottom: '12px', fontWeight: 600 }}>
                Holders / Accounts under District Committee:
              </div>

              {accounts.filter((a) => a.group === 'district_committee').length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: '#94A3B8', fontStyle: 'italic' }}>
                  No dedicated district accounts created yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {accounts
                    .filter((a) => a.group === 'district_committee')
                    .map((acc) => (
                      <div
                        key={acc.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 12px',
                          background: '#F8FAFC',
                          borderRadius: '8px',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '0.88rem', color: '#0F172A', display: 'block' }}>{acc.name}</strong>
                          <small style={{ fontSize: '0.74rem', color: '#64748B' }}>{acc.holderName || 'District Custodian'}</small>
                        </div>
                        <strong style={{ fontSize: '1rem', color: '#3730A3' }}>
                          {formatINRFromPaise(acc.currentBalancePaise)}
                        </strong>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Group 2: Kuppam Committee Funds */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '24px',
              border: '1.5px solid #CCFBF1',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Landmark size={20} color="#0D9488" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#134E4A', margin: 0 }}>
                    2. Kuppam Committee Funds (കുപ്പം കമ്മിറ്റി)
                  </h3>
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: '#F0FDFA', color: '#0F766E' }}>
                  Kuppam Unit
                </span>
              </div>

              <div style={{
                background: '#F0FDFA',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <span style={{ fontSize: '0.78rem', color: '#6B7280', fontWeight: 600 }}>Current Balance with Kuppam Unit:</span>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, color: '#0F766E' }}>
                  {formatINRFromPaise(summary.totalKuppamFundsPaise)}
                </div>
              </div>

              <div style={{ fontSize: '0.84rem', color: '#475569', marginBottom: '12px', fontWeight: 600 }}>
                Holders / Accounts under Kuppam Committee:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {accounts
                  .filter((a) => a.group === 'kuppam_committee' || a.group === 'bank' || a.group === 'cash_box')
                  .map((acc) => (
                    <div
                      key={acc.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        background: '#F8FAFC',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '0.88rem', color: '#0F172A', display: 'block' }}>{acc.name}</strong>
                        <small style={{ fontSize: '0.74rem', color: '#64748B' }}>
                          {acc.group === 'bank' ? 'Bank Account' : acc.group === 'cash_box' ? 'Cash Custody' : acc.holderName || 'Unit Handler'}
                        </small>
                      </div>
                      <strong style={{ fontSize: '1rem', color: '#065F46' }}>
                        {formatINRFromPaise(acc.currentBalancePaise)}
                      </strong>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Full Custodians & Accounts Table */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-900)', margin: '0 0 2px 0' }}>
                  All Fund Custodians &amp; Accounts (അക്കൗണ്ടുകളുടെ നിലവിലെ സ്ഥിതി)
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                  Detailed balance, inflows, outflows, and expenses for each holder.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFormError('');
                  setFormSuccess('');
                  setIsAccountModalOpen(true);
                }}
                className="btn btn-outline"
                style={{ padding: '8px 14px', fontSize: '0.82rem', gap: '6px' }}
              >
                <Plus size={15} />
                <span>Add Custodian</span>
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '14px 20px' }}>Account / Holder Name</th>
                    <th style={{ padding: '14px 16px' }}>Group / Category</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Total Received</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Transferred Out</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Expenses Paid</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>Current Balance</th>
                    <th style={{ padding: '14px 20px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => (
                    <tr key={acc.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A' }}>{acc.name}</div>
                        {acc.holderName && (
                          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                            Custodian: {acc.holderName} {acc.holderPhone ? `(${acc.holderPhone})` : ''}
                          </div>
                        )}
                        {acc.accountNumber && (
                          <div style={{ fontSize: '0.74rem', color: '#0369A1' }}>
                            A/c: {acc.accountNumber} ({acc.bankName})
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: acc.group === 'district_committee' ? '#EEF2FF' : acc.group === 'landowner' ? '#FEF3C7' : '#F0FDF4',
                          color: acc.group === 'district_committee' ? '#4338CA' : acc.group === 'landowner' ? '#B45309' : '#15803D',
                        }}>
                          {getGroupName(acc.group)}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: '#475569' }}>
                        {formatINRFromPaise(acc.totalReceivedPaise || acc.openingBalancePaise || 0)}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: '#E11D48' }}>
                        {formatINRFromPaise(acc.totalTransferredOutPaise || 0)}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: '#B45309' }}>
                        {formatINRFromPaise(acc.totalExpensesPaidPaise || 0)}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <strong style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '1.05rem',
                          color: acc.currentBalancePaise > 0 ? '#047857' : '#64748B',
                        }}>
                          {formatINRFromPaise(acc.currentBalancePaise || 0)}
                        </strong>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setTransferForm((prev) => ({ ...prev, fromAccountId: acc.id }));
                            setIsTransferModalOpen(true);
                          }}
                          disabled={acc.currentBalancePaise <= 0}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            background: acc.currentBalancePaise > 0 ? '#FFFFFF' : '#F1F5F9',
                            color: acc.currentBalancePaise > 0 ? '#065F46' : '#94A3B8',
                            cursor: acc.currentBalancePaise > 0 ? 'pointer' : 'not-allowed',
                          }}
                        >
                          Transfer Out
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: TRANSACTIONS & AUDIT HISTORY                        */}
      {/* ======================================================== */}
      {(activeTab === 'transfers' || activeTab === 'expenses' || activeTab === 'landowner' || activeTab === 'history') && (
        <div>
          {/* Filters Bar */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '16px 20px',
            border: '1px solid #E2E8F0',
            marginBottom: '20px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: 1, minWidth: '280px' }}>
              {/* Search */}
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search by description, reference, or recipient..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.86rem',
                  }}
                />
              </div>

              {/* Type Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  color: '#334155',
                }}
              >
                <option value="all">All Types (എല്ലാ ഇടപാടുകളും)</option>
                <option value="transfer">Money Transfers (കൈമാറ്റങ്ങൾ)</option>
                <option value="expense">Project Expenses (ചിലവുകൾ)</option>
                <option value="landowner_payment">Landowner Payments (ഭൂവുടമയ്ക്ക്)</option>
              </select>

              {/* Account Filter */}
              <select
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  color: '#334155',
                }}
              >
                <option value="all">All Accounts / Custodians</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
              />
              <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
              />
              {(searchTerm || filterType !== 'all' || filterAccount !== 'all' || startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterType('all');
                    setFilterAccount('all');
                    setStartDate('');
                    setEndDate('');
                  }}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: '#64748B',
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Transactions Table */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <strong style={{ fontSize: '1rem', color: '#0F172A' }}>
                Financial Transaction Ledger ({filteredTransactions.length} records)
              </strong>
            </div>

            {filteredTransactions.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94A3B8' }}>
                <ReceiptText size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#475569', margin: '0 0 4px 0' }}>
                  No transactions found
                </h4>
                <p style={{ fontSize: '0.84rem', margin: 0 }}>
                  Record a money transfer, project expense, or landowner payment using the buttons above.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '12px 18px' }}>Date &amp; ID</th>
                      <th style={{ padding: '12px 14px' }}>Type</th>
                      <th style={{ padding: '12px 16px' }}>Flow (From ➔ To / Recipient)</th>
                      <th style={{ padding: '12px 16px' }}>Purpose / Category</th>
                      <th style={{ padding: '12px 18px', textAlign: 'right' }}>Amount (₹)</th>
                      <th style={{ padding: '12px 14px' }}>Ref / Notes</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((t) => {
                      const isCancelled = t.status === 'cancelled';
                      return (
                        <tr
                          key={t.id}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            background: isCancelled ? '#FFF1F2' : '#FFFFFF',
                            opacity: isCancelled ? 0.75 : 1,
                          }}
                        >
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: 800, color: '#0F172A' }}>{t.date}</div>
                            <small style={{ fontFamily: 'monospace', color: '#64748B', fontSize: '0.72rem' }}>
                              {t.transactionNumber}
                            </small>
                          </td>
                          <td style={{ padding: '14px 14px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              background:
                                t.transactionType === 'transfer'
                                  ? '#EEF2FF'
                                  : t.transactionType === 'landowner_payment'
                                  ? '#FEF3C7'
                                  : '#FCE7F3',
                              color:
                                t.transactionType === 'transfer'
                                  ? '#4338CA'
                                  : t.transactionType === 'landowner_payment'
                                  ? '#B45309'
                                  : '#BE185D',
                            }}>
                              {t.transactionType === 'transfer' && <ArrowRightLeft size={12} />}
                              {t.transactionType === 'landowner_payment' && <Building2 size={12} />}
                              {t.transactionType === 'expense' && <TrendingDown size={12} />}
                              <span>{t.transactionType.replace('_', ' ')}</span>
                            </span>
                            {isCancelled && (
                              <span style={{ display: 'block', color: '#E11D48', fontSize: '0.7rem', fontWeight: 800, marginTop: '2px' }}>
                                CANCELLED
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 700, color: '#0F172A' }}>
                              {t.fromAccountName || 'Source'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#047857', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <span>➔</span>
                              <strong>{t.toAccountName || t.paidToRecipient || 'Recipient'}</strong>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 700, color: '#0F172A' }}>
                              {t.expenseTitle || (t.category ? getCategoryLabel(t.category) : 'Fund Movement')}
                            </div>
                            {t.category && (
                              <small style={{ color: '#64748B', fontSize: '0.74rem' }}>
                                {getCategoryLabel(t.category)}
                              </small>
                            )}
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <strong style={{
                              fontFamily: 'var(--font-display)',
                              fontSize: '1.05rem',
                              color: isCancelled ? '#94A3B8' : t.transactionType === 'expense' ? '#BE123C' : '#0F172A',
                              textDecoration: isCancelled ? 'line-through' : 'none',
                            }}>
                              {formatINRFromPaise(t.amountPaise)}
                            </strong>
                          </td>
                          <td style={{ padding: '14px 14px' }}>
                            {t.referenceNumber && (
                              <div style={{ fontSize: '0.74rem', color: '#0369A1', fontWeight: 600 }}>
                                Ref: {t.referenceNumber}
                              </div>
                            )}
                            {t.notes && (
                              <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                                {t.notes}
                              </div>
                            )}
                            {t.cancellationReason && (
                              <div style={{ fontSize: '0.72rem', color: '#BE123C', fontStyle: 'italic' }}>
                                Reason: {t.cancellationReason}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            {!isCancelled && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCancelModalTxn(t);
                                  setCancelReason('');
                                }}
                                style={{
                                  padding: '3px 8px',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  borderRadius: '6px',
                                  border: '1px solid #FECDD3',
                                  background: '#FFF1F2',
                                  color: '#BE123C',
                                  cursor: 'pointer',
                                }}
                              >
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ADD MONEY TRANSFER                              */}
      {/* ======================================================== */}
      {isTransferModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '540px',
            padding: '24px',
            boxShadow: 'var(--shadow-xl)',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowRightLeft size={20} color="#047857" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                  Record Money Transfer (പണം കൈമാറ്റം)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: '16px' }}>
              Transfer funds between custodians/accounts. Reduces sender balance and increases receiver balance.
            </p>

            {formError && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '0.84rem', marginBottom: '14px' }}>
                {formError}
              </div>
            )}
            {formSuccess && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#F0FDF4', border: '1px solid #86EFAC', color: '#15803D', fontSize: '0.84rem', marginBottom: '14px' }}>
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleTransferSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* From Account */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    From Account / Sender (ആരിൽ നിന്ന്) *
                  </label>
                  <select
                    required
                    value={transferForm.fromAccountId}
                    onChange={(e) => setTransferForm({ ...transferForm, fromAccountId: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  >
                    <option value="">-- Select Sender Account --</option>
                    {accounts.filter((a) => a.isActive && a.group !== 'landowner').map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} (Bal: {formatINRFromPaise(a.currentBalancePaise)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* To Account */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    To Account / Receiver (ആരിലേക്ക്) *
                  </label>
                  <select
                    required
                    value={transferForm.toAccountId}
                    onChange={(e) => setTransferForm({ ...transferForm, toAccountId: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  >
                    <option value="">-- Select Receiver Account --</option>
                    {accounts.filter((a) => a.isActive && a.id !== transferForm.fromAccountId).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({getGroupName(a.group)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Transfer Amount (തുക ₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    step="any"
                    placeholder="Enter amount in ₹"
                    value={transferForm.amountRupees}
                    onChange={(e) => setTransferForm({ ...transferForm, amountRupees: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #047857', fontSize: '1.1rem', fontWeight: 800, color: '#064E3B' }}
                  />
                </div>

                {/* Date */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Date (തീയതി) *
                  </label>
                  <input
                    type="date"
                    required
                    value={transferForm.date}
                    onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>

                {/* Purpose */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Transfer Purpose / Description (ഉദ്ദേശ്യം)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Handover of weekend collection to treasurer"
                    value={transferForm.purpose}
                    onChange={(e) => setTransferForm({ ...transferForm, purpose: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>

                {/* Reference Number */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Reference Number (UTR / Cheque No / Slip Ref)
                  </label>
                  <input
                    type="text"
                    placeholder="Optional bank ref / voucher number"
                    value={transferForm.referenceNumber}
                    onChange={(e) => setTransferForm({ ...transferForm, referenceNumber: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Notes (കുറിപ്പ്)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Additional notes..."
                    value={transferForm.notes}
                    onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsTransferModalOpen(false)}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#047857', color: '#FFFFFF', fontWeight: 800, cursor: 'pointer' }}
                  >
                    {isSubmitting ? 'Recording...' : 'Record Transfer'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: ADD EXPENSE                                     */}
      {/* ======================================================== */}
      {isExpenseModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '540px',
            padding: '24px',
            boxShadow: 'var(--shadow-xl)',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingDown size={20} color="#E11D48" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                  Record Project Expense (ചിലവ്)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: '16px' }}>
              Record printing, legal, documentation, or operational expenses. Deducts balance from the selected account.
            </p>

            {formError && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '0.84rem', marginBottom: '14px' }}>
                {formError}
              </div>
            )}
            {formSuccess && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#F0FDF4', border: '1px solid #86EFAC', color: '#15803D', fontSize: '0.84rem', marginBottom: '14px' }}>
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleExpenseSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Title */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Expense Title (ചിലവിന്റെ പേര്) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Brochure & Banner Printing"
                    value={expenseForm.expenseTitle}
                    onChange={(e) => setExpenseForm({ ...expenseForm, expenseTitle: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>

                {/* Category & Amount */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Category (വിഭാഗം) *
                    </label>
                    <select
                      value={expenseForm.category}
                      onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as any })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
                    >
                      <option value="printing">Printing Expense</option>
                      <option value="documentation">Documentation &amp; Legal</option>
                      <option value="land_related">Land-related Expense</option>
                      <option value="travel">Travel &amp; Conveyance</option>
                      <option value="office">Office &amp; Stage Setup</option>
                      <option value="other">Other Expenses</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Amount (തുക ₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      step="any"
                      placeholder="Amount ₹"
                      value={expenseForm.amountRupees}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amountRupees: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #E11D48', fontSize: '1rem', fontWeight: 800, color: '#BE123C' }}
                    />
                  </div>
                </div>

                {/* Paid From Account */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Paid From (ആരുടെ കയ്യിൽ നിന്ന് നൽകി) *
                  </label>
                  <select
                    required
                    value={expenseForm.fromAccountId}
                    onChange={(e) => setExpenseForm({ ...expenseForm, fromAccountId: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  >
                    <option value="">-- Select Source Account / Custodian --</option>
                    {accounts.filter((a) => a.isActive && a.group !== 'landowner').map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} (Bal: {formatINRFromPaise(a.currentBalancePaise)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Paid to & Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Paid To (Recipient / Shop)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Al-Noor Printers"
                      value={expenseForm.paidToRecipient}
                      onChange={(e) => setExpenseForm({ ...expenseForm, paidToRecipient: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Date (തീയതി) *
                    </label>
                    <input
                      type="date"
                      required
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>

                {/* Ref & Notes */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Bill No / Voucher Reference
                  </label>
                  <input
                    type="text"
                    placeholder="Optional Bill / Invoice number"
                    value={expenseForm.referenceNumber}
                    onChange={(e) => setExpenseForm({ ...expenseForm, referenceNumber: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Notes (കുറിപ്പ്)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Additional details..."
                    value={expenseForm.notes}
                    onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsExpenseModalOpen(false)}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#E11D48', color: '#FFFFFF', fontWeight: 800, cursor: 'pointer' }}
                  >
                    {isSubmitting ? 'Saving...' : 'Record Expense'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: PAY LANDOWNER                                   */}
      {/* ======================================================== */}
      {isLandownerModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '540px',
            padding: '24px',
            boxShadow: 'var(--shadow-xl)',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={20} color="#D97706" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                  Record Landowner Payment (ഭൂവുടമയ്ക്ക് നൽകിയത്)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLandownerModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: '16px' }}>
              Record land purchase installment/payment directly to the landowner. Deducts from the source account.
            </p>

            {formError && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '0.84rem', marginBottom: '14px' }}>
                {formError}
              </div>
            )}
            {formSuccess && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#F0FDF4', border: '1px solid #86EFAC', color: '#15803D', fontSize: '0.84rem', marginBottom: '14px' }}>
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleLandownerSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Source Account */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Paid From (സ്രോതസ്സ് - ആരുടെ കയ്യിൽ നിന്ന്) *
                  </label>
                  <select
                    required
                    value={landownerForm.fromAccountId}
                    onChange={(e) => setLandownerForm({ ...landownerForm, fromAccountId: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  >
                    <option value="">-- Select Source Account / Custodian --</option>
                    {accounts.filter((a) => a.isActive && a.group !== 'landowner').map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} (Bal: {formatINRFromPaise(a.currentBalancePaise)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Payment Amount (നൽകിയ തുക ₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    step="any"
                    placeholder="Enter amount in ₹"
                    value={landownerForm.amountRupees}
                    onChange={(e) => setLandownerForm({ ...landownerForm, amountRupees: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #D97706', fontSize: '1.1rem', fontWeight: 800, color: '#B45309' }}
                  />
                </div>

                {/* Landowner Name & Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Paid To (ഭൂവുടമയുടെ പേര്) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Landowner Name"
                      value={landownerForm.paidToRecipient}
                      onChange={(e) => setLandownerForm({ ...landownerForm, paidToRecipient: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Date (തീയതി) *
                    </label>
                    <input
                      type="date"
                      required
                      value={landownerForm.date}
                      onChange={(e) => setLandownerForm({ ...landownerForm, date: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>

                {/* Reference No */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Reference Number (Cheque No / Bank UTR / Receipt Ref)
                  </label>
                  <input
                    type="text"
                    placeholder="Bank reference or voucher number"
                    value={landownerForm.referenceNumber}
                    onChange={(e) => setLandownerForm({ ...landownerForm, referenceNumber: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Notes (കുറിപ്പ്)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Installment details, witness names, or agreement notes..."
                    value={landownerForm.notes}
                    onChange={(e) => setLandownerForm({ ...landownerForm, notes: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsLandownerModalOpen(false)}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#D97706', color: '#FFFFFF', fontWeight: 800, cursor: 'pointer' }}
                  >
                    {isSubmitting ? 'Recording...' : 'Record Payment'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: ADD CUSTODIAN / ACCOUNT                         */}
      {/* ======================================================== */}
      {isAccountModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '540px',
            padding: '24px',
            boxShadow: 'var(--shadow-xl)',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={20} color="#064E3B" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                  Add Finance Custodian / Account
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '0.84rem', marginBottom: '14px' }}>
                {formError}
              </div>
            )}
            {formSuccess && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#F0FDF4', border: '1px solid #86EFAC', color: '#15803D', fontSize: '0.84rem', marginBottom: '14px' }}>
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleAccountSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Account Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Account / Custodian Name (പേര്) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Federal Bank Kuppam / P. Abdullah (Treasurer)"
                    value={accountForm.name}
                    onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>

                {/* Group */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Financial Group (വിഭാഗം) *
                  </label>
                  <select
                    value={accountForm.group}
                    onChange={(e) => setAccountForm({ ...accountForm, group: e.target.value as any })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
                  >
                    <option value="kuppam_committee">Kuppam Committee Fund (കുപ്പം കമ്മിറ്റി ഫണ്ട്)</option>
                    <option value="district_committee">District Committee Fund (ജില്ലാ കമ്മിറ്റി ഫണ്ട്)</option>
                    <option value="finance_handler">Individual Finance Handler (വ്യക്തിയുടെ കൈവശം)</option>
                    <option value="bank">Bank Account (ബാങ്ക് അക്കൗണ്ട്)</option>
                    <option value="cash_box">Cash Custody (കാഷ് ബോക്സ് / കൗണ്ടർ)</option>
                    <option value="landowner">Landowner Account (ഭൂവുടമ)</option>
                  </select>
                </div>

                {/* Person / Holder Name & Phone */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Holder / Responsible Person
                    </label>
                    <input
                      type="text"
                      placeholder="Person in charge"
                      value={accountForm.holderName}
                      onChange={(e) => setAccountForm({ ...accountForm, holderName: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Phone (ഫോൺ)
                    </label>
                    <input
                      type="tel"
                      placeholder="Contact number"
                      value={accountForm.holderPhone}
                      onChange={(e) => setAccountForm({ ...accountForm, holderPhone: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>

                {/* Bank Details (optional) */}
                {(accountForm.group === 'bank' || accountForm.group === 'kuppam_committee') && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        Bank Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Federal Bank / SBI"
                        value={accountForm.bankName}
                        onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        Account Number
                      </label>
                      <input
                        type="text"
                        placeholder="Bank A/c No"
                        value={accountForm.accountNumber}
                        onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                      />
                    </div>
                  </div>
                )}

                {/* Initial Balance */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Opening / Initial Balance (പ്രാരംഭ ബാലൻസ് ₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={accountForm.openingBalanceRupees}
                    onChange={(e) => setAccountForm({ ...accountForm, openingBalanceRupees: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                  <small style={{ fontSize: '0.74rem', color: '#64748B' }}>
                    Enter initial amount already held if setting up existing custody.
                  </small>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsAccountModalOpen(false)}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#064E3B', color: '#FFFFFF', fontWeight: 800, cursor: 'pointer' }}
                  >
                    {isSubmitting ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: CANCEL / REVERSE TRANSACTION CONFIRMATION       */}
      {/* ======================================================== */}
      {cancelModalTxn && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            boxShadow: 'var(--shadow-xl)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: '#BE123C' }}>
              <AlertCircle size={22} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0 }}>
                Cancel &amp; Reverse Transaction
              </h3>
            </div>

            <p style={{ fontSize: '0.84rem', color: '#475569', marginBottom: '14px', lineHeight: 1.5 }}>
              Are you sure you want to cancel transaction <strong>{cancelModalTxn.transactionNumber}</strong>?
              This will automatically reverse the account balances.
            </p>

            <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.84rem' }}>
              <div>Amount: <strong>{formatINRFromPaise(cancelModalTxn.amountPaise)}</strong></div>
              <div>Flow: {cancelModalTxn.fromAccountName} ➔ {cancelModalTxn.toAccountName || cancelModalTxn.paidToRecipient}</div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Reason for cancellation (കാരണം) *
              </label>
              <textarea
                required
                rows={2}
                placeholder="Why is this entry being cancelled? (Mandatory for audit trail)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setCancelModalTxn(null)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCancelTransaction}
                disabled={isSubmitting || !cancelReason.trim()}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#E11D48', color: '#FFFFFF', fontWeight: 800, cursor: 'pointer' }}
              >
                {isSubmitting ? 'Reversing...' : 'Confirm Reversal'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

