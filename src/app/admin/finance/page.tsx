'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAdminAuth } from '@/lib/state/adminAuth';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import {
  KuppamHandler,
  FinanceRecord,
  FinanceRecordType,
  FinanceSourceType,
} from '@/lib/types/finance';
import {
  subscribeToKuppamHandlers,
  createKuppamHandler,
  subscribeToFinanceRecords,
  recordMoneyHandover,
  recordFinanceExpense,
  recordLandownerPayment,
  cancelFinanceRecord,
} from '@/lib/firebase/finance';
import {
  Building2,
  Landmark,
  Users,
  Wallet,
  ArrowRightLeft,
  Receipt,
  FileSpreadsheet,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  Printer,
  ChevronDown,
  ArrowUpRight,
  TrendingDown,
  Layers,
  Phone,
  Calendar,
  X,
} from 'lucide-react';

function formatINR(paise: number): string {
  const rupees = Math.round(paise / 100);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

export default function FinanceManagementPage() {
  const { adminUser } = useAdminAuth();

  // 1. Live Real-Time Cash Collections from Firestore
  const [cashCollections, setCashCollections] = useState<any[]>([]);
  const [isCashLoading, setIsCashLoading] = useState(true);

  // 2. Kuppam Handlers & Finance Records
  const [handlers, setHandlers] = useState<KuppamHandler[]>([]);
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);

  // Alerts & Modals
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [isHandlerModalOpen, setIsHandlerModalOpen] = useState(false);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isLandownerModalOpen, setIsLandownerModalOpen] = useState(false);
  const [cancellingRecord, setCancellingRecord] = useState<FinanceRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Form states
  const [handlerForm, setHandlerForm] = useState({ name: '', phone: '', role: 'കമ്മിറ്റി അംഗം', notes: '' });
  const [handoverForm, setHandoverForm] = useState({
    targetHandlerId: '',
    amountRupees: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amountRupees: '',
    category: 'printing',
    sourceType: 'kuppam_handler' as 'district' | 'kuppam_main' | 'kuppam_handler',
    sourceHandlerId: '',
    recipient: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [landownerForm, setLandownerForm] = useState({
    amountRupees: '',
    sourceType: 'district' as 'district' | 'kuppam_handler' | 'kuppam_main',
    sourceHandlerId: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter & Search states for transactions
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'kuppam' | 'district' | 'ledger'>('overview');

  // Load Real Cash Collections
  useEffect(() => {
    const q = query(collection(db, 'cashCollections'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: any[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setCashCollections(list);
        setIsCashLoading(false);
      },
      (err) => {
        console.error('Error fetching cash collections:', err);
        setIsCashLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Load Kuppam Handlers
  useEffect(() => {
    const unsubHandlers = subscribeToKuppamHandlers((list) => {
      setHandlers(list);
    });
    const unsubRecords = subscribeToFinanceRecords((list) => {
      setRecords(list);
      setIsLoadingRecords(false);
    });
    return () => {
      unsubHandlers();
      unsubRecords();
    };
  }, []);

  // Compute live calculations
  const financeData = useMemo(() => {
    // 1. Collections from actual receipts
    let totalCashPaise = 0;
    let districtCollectedPaise = 0;
    let kuppamCollectedPaise = 0;

    cashCollections.forEach((c) => {
      const amt = Number(c.amountPaise) || 0;
      totalCashPaise += amt;
      if (c.receivingEntity === 'district') {
        districtCollectedPaise += amt;
      } else {
        kuppamCollectedPaise += amt;
      }
    });

    // 2. Process active finance records
    const activeRecords = records.filter((r) => r.status === 'active');

    let districtExpensesPaise = 0;
    let districtLandownerPaise = 0;

    let kuppamMainDirectExpensesPaise = 0;
    let kuppamMainDirectLandownerPaise = 0;

    // Per-handler calculations
    const handlerStats: {
      [id: string]: {
        receivedPaise: number;
        expensesPaise: number;
        landownerPaise: number;
        balancePaise: number;
      };
    } = {};

    handlers.forEach((h) => {
      handlerStats[h.id] = { receivedPaise: 0, expensesPaise: 0, landownerPaise: 0, balancePaise: 0 };
    });

    let totalHandedOverToHandlersPaise = 0;
    let totalExpensesPaise = 0;
    let totalLandownerPaidPaise = 0;

    activeRecords.forEach((r) => {
      const amt = r.amountPaise || 0;

      if (r.type === 'handover') {
        // Handover to a handler
        if (r.targetHandlerId && handlerStats[r.targetHandlerId]) {
          handlerStats[r.targetHandlerId].receivedPaise += amt;
        }
        totalHandedOverToHandlersPaise += amt;
      } else if (r.type === 'expense') {
        totalExpensesPaise += amt;
        if (r.sourceType === 'district') {
          districtExpensesPaise += amt;
        } else if (r.sourceType === 'kuppam_main') {
          kuppamMainDirectExpensesPaise += amt;
        } else if (r.sourceType === 'handler' && r.sourceHandlerId && handlerStats[r.sourceHandlerId]) {
          handlerStats[r.sourceHandlerId].expensesPaise += amt;
        }
      } else if (r.type === 'landowner_payment') {
        totalLandownerPaidPaise += amt;
        if (r.sourceType === 'district') {
          districtLandownerPaise += amt;
        } else if (r.sourceType === 'kuppam_main') {
          kuppamMainDirectLandownerPaise += amt;
        } else if (r.sourceType === 'handler' && r.sourceHandlerId && handlerStats[r.sourceHandlerId]) {
          handlerStats[r.sourceHandlerId].landownerPaise += amt;
        }
      }
    });

    // Compute net handler balances
    let totalBalanceHeldByHandlersPaise = 0;
    handlers.forEach((h) => {
      const stat = handlerStats[h.id];
      if (stat) {
        stat.balancePaise = stat.receivedPaise - stat.expensesPaise - stat.landownerPaise;
        totalBalanceHeldByHandlersPaise += stat.balancePaise;
      }
    });

    // District Balance
    const districtBalancePaise = districtCollectedPaise - districtExpensesPaise - districtLandownerPaise;

    // Kuppam Main Cash remaining in treasury (not yet handed over to handlers or spent)
    const kuppamMainBalancePaise =
      kuppamCollectedPaise -
      totalHandedOverToHandlersPaise -
      kuppamMainDirectExpensesPaise -
      kuppamMainDirectLandownerPaise;

    // Total Kuppam available = Kuppam Main Cash + Handlers' in-hand balances
    const kuppamTotalAvailablePaise = kuppamMainBalancePaise + totalBalanceHeldByHandlersPaise;

    // Overall Net Balance in hand across all accounts
    const overallNetBalancePaise = totalCashPaise - totalExpensesPaise - totalLandownerPaidPaise;

    return {
      totalCashPaise,
      districtCollectedPaise,
      kuppamCollectedPaise,
      districtExpensesPaise,
      districtLandownerPaise,
      districtBalancePaise,
      totalHandedOverToHandlersPaise,
      kuppamMainBalancePaise,
      totalBalanceHeldByHandlersPaise,
      kuppamTotalAvailablePaise,
      totalExpensesPaise,
      totalLandownerPaidPaise,
      overallNetBalancePaise,
      handlerStats,
    };
  }, [cashCollections, records, handlers]);

  // Handle Create Handler (Person)
  const handleAddHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handlerForm.name.trim()) return;

    try {
      setIsSubmitting(true);
      await createKuppamHandler(handlerForm);
      setSuccessMessage(`വ്യക്തിയെ വിജയകരമായി ചേർത്തു: ${handlerForm.name}`);
      setHandlerForm({ name: '', phone: '', role: 'കമ്മിറ്റി അംഗം', notes: '' });
      setIsHandlerModalOpen(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'വ്യക്തിയെ ചേർക്കാൻ സാധിച്ചില്ല');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Handover of Money to a Person
  const handleRecordHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(handoverForm.amountRupees);
    if (isNaN(numAmt) || numAmt <= 0) {
      setErrorMessage('സാധുവായ തുക നൽകുക');
      return;
    }
    if (!handoverForm.targetHandlerId) {
      setErrorMessage('പണം ഏൽപ്പിക്കേണ്ട വ്യക്തിയെ തിരഞ്ഞെടുക്കുക');
      return;
    }

    const targetHandler = handlers.find((h) => h.id === handoverForm.targetHandlerId);

    try {
      setIsSubmitting(true);
      await recordMoneyHandover({
        amountPaise: Math.round(numAmt * 100),
        targetHandlerId: handoverForm.targetHandlerId,
        targetHandlerName: targetHandler?.name || 'അംഗം',
        date: handoverForm.date,
        notes: handoverForm.notes,
        createdByUid: adminUser?.uid || 'admin',
        createdByName: adminUser?.name || 'Administrator',
      });
      setSuccessMessage(`₹${numAmt.toLocaleString('en-IN')} വിജയകരമായി ${targetHandler?.name}-ക്ക് ഏൽപ്പിച്ചു`);
      setHandoverForm({
        targetHandlerId: '',
        amountRupees: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setIsHandoverModalOpen(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'പണം ഏൽപ്പിക്കുന്നത് രേഖപ്പെടുത്താൻ കഴിഞ്ഞില്ല');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Add Expense
  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(expenseForm.amountRupees);
    if (isNaN(numAmt) || numAmt <= 0) {
      setErrorMessage('സാധുവായ തുക നൽകുക');
      return;
    }
    if (!expenseForm.title.trim()) {
      setErrorMessage('ചെലവിന്റെ കാരണം നൽകുക');
      return;
    }

    let sourceType: FinanceSourceType = 'kuppam_main';
    let sourceHandlerId = '';
    let sourceHandlerName = 'കുപ്പം മെയിൻ ഫണ്ട്';

    if (expenseForm.sourceType === 'district') {
      sourceType = 'district';
      sourceHandlerName = 'ജില്ലാ കമ്മിറ്റി അക്കൗണ്ട്';
    } else if (expenseForm.sourceType === 'kuppam_handler') {
      if (!expenseForm.sourceHandlerId) {
        setErrorMessage('ഏത് വ്യക്തിയുടെ പക്കൽ നിന്നാണ് പണം നൽകിയതെന്ന് തിരഞ്ഞെടുക്കുക');
        return;
      }
      sourceType = 'handler';
      sourceHandlerId = expenseForm.sourceHandlerId;
      const h = handlers.find((x) => x.id === sourceHandlerId);
      sourceHandlerName = h?.name || 'കമ്മിറ്റി അംഗം';
    }

    try {
      setIsSubmitting(true);
      await recordFinanceExpense({
        amountPaise: Math.round(numAmt * 100),
        title: expenseForm.title.trim(),
        category: expenseForm.category,
        sourceType,
        sourceHandlerId,
        sourceHandlerName,
        recipient: expenseForm.recipient,
        date: expenseForm.date,
        notes: expenseForm.notes,
        createdByUid: adminUser?.uid || 'admin',
        createdByName: adminUser?.name || 'Administrator',
      });
      setSuccessMessage(`₹${numAmt.toLocaleString('en-IN')} ചിലവ് വിജയകരമായി രേഖപ്പെടുത്തി (${sourceHandlerName})`);
      setExpenseForm({
        title: '',
        amountRupees: '',
        category: 'printing',
        sourceType: 'kuppam_handler',
        sourceHandlerId: handlers[0]?.id || '',
        recipient: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setIsExpenseModalOpen(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'ചെലവ് രേഖപ്പെടുത്താൻ കഴിഞ്ഞില്ല');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Landowner Payment
  const handleRecordLandowner = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(landownerForm.amountRupees);
    if (isNaN(numAmt) || numAmt <= 0) {
      setErrorMessage('സാധുവായ തുക നൽകുക');
      return;
    }

    let sourceType: FinanceSourceType = 'district';
    let sourceHandlerId = '';
    let sourceHandlerName = 'ജില്ലാ കമ്മിറ്റി അക്കൗണ്ട്';

    if (landownerForm.sourceType === 'kuppam_handler') {
      if (!landownerForm.sourceHandlerId) {
        setErrorMessage('ഏത് വ്യക്തിയാണ് നൽകിയതെന്ന് തിരഞ്ഞെടുക്കുക');
        return;
      }
      sourceType = 'handler';
      sourceHandlerId = landownerForm.sourceHandlerId;
      const h = handlers.find((x) => x.id === sourceHandlerId);
      sourceHandlerName = h?.name || 'കമ്മിറ്റി അംഗം';
    } else if (landownerForm.sourceType === 'kuppam_main') {
      sourceType = 'kuppam_main';
      sourceHandlerName = 'കുപ്പം മെയിൻ ഫണ്ട്';
    }

    try {
      setIsSubmitting(true);
      await recordLandownerPayment({
        amountPaise: Math.round(numAmt * 100),
        sourceType,
        sourceHandlerId,
        sourceHandlerName,
        date: landownerForm.date,
        notes: landownerForm.notes,
        createdByUid: adminUser?.uid || 'admin',
        createdByName: adminUser?.name || 'Administrator',
      });
      setSuccessMessage(`₹${numAmt.toLocaleString('en-IN')} ഭൂവുടമയ്ക്കുള്ള പേയ്‌മെന്റ് വിജയകരമായി രേഖപ്പെടുത്തി`);
      setLandownerForm({
        amountRupees: '',
        sourceType: 'district',
        sourceHandlerId: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setIsLandownerModalOpen(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'ഭൂവുടമ പേയ്‌മെന്റ് രേഖപ്പെടുത്താൻ കഴിഞ്ഞില്ല');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Cancel Record
  const handleConfirmCancelRecord = async () => {
    if (!cancellingRecord) return;
    try {
      setIsSubmitting(true);
      await cancelFinanceRecord(cancellingRecord.id, cancelReason, {
        uid: adminUser?.uid || 'admin',
        name: adminUser?.name || 'Administrator',
      });
      setSuccessMessage(`ഇടപാട് ${cancellingRecord.recordNumber} വിജയകരമായി റദ്ദാക്കി`);
      setCancellingRecord(null);
      setCancelReason('');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'ഇടപാട് റദ്ദാക്കാൻ കഴിഞ്ഞില്ല');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterType !== 'all' && r.type !== filterType) return false;
      if (filterAccount !== 'all') {
        if (filterAccount === 'district' && r.sourceType !== 'district') return false;
        if (filterAccount === 'kuppam_main' && r.sourceType !== 'kuppam_main') return false;
        if (filterAccount.startsWith('handler_')) {
          const hid = filterAccount.replace('handler_', '');
          if (r.sourceHandlerId !== hid && r.targetHandlerId !== hid) return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = r.title.toLowerCase().includes(q);
        const matchesNotes = r.notes ? r.notes.toLowerCase().includes(q) : false;
        const matchesRef = r.recordNumber.toLowerCase().includes(q);
        const matchesSource = r.sourceHandlerName ? r.sourceHandlerName.toLowerCase().includes(q) : false;
        const matchesTarget = r.targetHandlerName ? r.targetHandlerName.toLowerCase().includes(q) : false;
        if (!matchesTitle && !matchesNotes && !matchesRef && !matchesSource && !matchesTarget) {
          return false;
        }
      }
      return true;
    });
  }, [records, filterType, filterAccount, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <Landmark className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Finance Management (ധനകാര്യ മാനേജ്‌മെന്റ്)
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            കളക്ഷൻ തുകകൾ തത്സമയം നിരീക്ഷിക്കുക, ജില്ലാ & കുപ്പം കമ്മിറ്റി ഫണ്ടുകൾ, വ്യക്തികളുടെ കൈവശമുള്ള തുക, ചിലവുകൾ എന്നിവ കൈകാര്യം ചെയ്യുക.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsHandoverModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <ArrowRightLeft className="w-4 h-4" />
            പണം ഏൽപ്പിക്കുക
          </button>

          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs md:text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <Receipt className="w-4 h-4" />
            ചിലവ് രേഖപ്പെടുത്തുക
          </button>

          <button
            onClick={() => setIsLandownerModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs md:text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <Building2 className="w-4 h-4" />
            ഭൂവുടമ പേയ്‌മെന്റ്
          </button>

          <button
            onClick={() => setIsHandlerModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs md:text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            വ്യക്തിയെ ചേർക്കുക
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-700 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Cash Collected */}
        <div className="bg-white border border-slate-200 border-t-4 border-t-emerald-600 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">ആകെ പിരിവ്</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded">Live Auto</span>
          </div>
          <div className="text-xl md:text-2xl font-black text-slate-900 mt-2">
            {formatINR(financeData.totalCashPaise)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">റസീതുകളിൽ നിന്ന് ഓട്ടോമാറ്റിക്കായി</p>
        </div>

        {/* District Committee Funds */}
        <div className="bg-white border border-slate-200 border-t-4 border-t-blue-600 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">ജില്ലാ ഫണ്ട്</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl md:text-2xl font-black text-blue-900 mt-2">
            {formatINR(financeData.districtBalancePaise)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">ലഭിച്ചത്: {formatINR(financeData.districtCollectedPaise)}</p>
        </div>

        {/* Kuppam Committee Funds */}
        <div className="bg-white border border-slate-200 border-t-4 border-t-teal-600 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">കുപ്പം ഫണ്ട്</span>
            <Landmark className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-xl md:text-2xl font-black text-teal-900 mt-2">
            {formatINR(financeData.kuppamTotalAvailablePaise)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">ലഭിച്ചത്: {formatINR(financeData.kuppamCollectedPaise)}</p>
        </div>

        {/* Total Handed Over to People */}
        <div className="bg-white border border-slate-200 border-t-4 border-t-indigo-600 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">ആളുകളുടെ കൈയിൽ</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl md:text-2xl font-black text-indigo-900 mt-2">
            {formatINR(financeData.totalBalanceHeldByHandlersPaise)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{handlers.length} വ്യക്തികൾ / അക്കൗണ്ട്</p>
        </div>

        {/* Total Paid to Landowner */}
        <div className="bg-white border border-slate-200 border-t-4 border-t-rose-600 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">ഭൂവുടമയ്ക്ക്</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl md:text-2xl font-black text-rose-900 mt-2">
            {formatINR(financeData.totalLandownerPaidPaise)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">ഭൂമി ഏറ്റെടുക്കലിന് നൽകിയത്</p>
        </div>

        {/* Total Expenses */}
        <div className="bg-white border border-slate-200 border-t-4 border-t-amber-600 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">ആകെ ചിലവുകൾ</span>
            <Receipt className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl md:text-2xl font-black text-amber-900 mt-2">
            {formatINR(financeData.totalExpensesPaise)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">പ്രിന്റിംഗ് & മറ്റു ചിലവുകൾ</p>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 pt-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition ${
            activeTab === 'overview'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          🏛️ പ്രധാന അവലോകനം (Overview)
        </button>
        <button
          onClick={() => setActiveTab('kuppam')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition ${
            activeTab === 'kuppam'
              ? 'border-teal-600 text-teal-700 bg-teal-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          👥 കുപ്പം കമ്മിറ്റിയും ആളുകളും ({handlers.length})
        </button>
        <button
          onClick={() => setActiveTab('district')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition ${
            activeTab === 'district'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          🏛️ ജില്ലാ കമ്മിറ്റി ഫണ്ട്
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition ${
            activeTab === 'ledger'
              ? 'border-slate-800 text-slate-900 bg-slate-100'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          📜 എല്ലാ ഇടപാടുകളുടെയും കണക്ക് ({records.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* DISTRICT COMMITTEE CARD */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                    <Building2 className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900">ജില്ലാ കമ്മിറ്റി അക്കൗണ്ട്</h3>
                    <p className="text-xs text-slate-500">ജില്ലാ കമ്മിറ്റിയുടെ ഫണ്ട് നേരിട്ട് ജില്ലാ അക്കൗണ്ടിൽ</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                  District Account
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-xs text-slate-500">കളക്ഷൻ വഴി ലഭിച്ചത്:</span>
                  <div className="text-base font-bold text-slate-800 mt-1">
                    {formatINR(financeData.districtCollectedPaise)}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-xs text-slate-500">ചിലവാക്കിയ തുക:</span>
                  <div className="text-base font-bold text-amber-700 mt-1">
                    {formatINR(financeData.districtExpensesPaise)}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-xs text-slate-500">ഭൂവുടമയ്ക്ക് നൽകിയത്:</span>
                  <div className="text-base font-bold text-rose-700 mt-1">
                    {formatINR(financeData.districtLandownerPaise)}
                  </div>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <span className="text-xs font-semibold text-blue-700">ജില്ലാ ഫണ്ട് ബാക്കി:</span>
                  <div className="text-lg font-black text-blue-900 mt-1">
                    {formatINR(financeData.districtBalancePaise)}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setExpenseForm((prev) => ({ ...prev, sourceType: 'district', sourceHandlerId: '' }));
                    setIsExpenseModalOpen(true);
                  }}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg text-center transition"
                >
                  + ചിലവ് നൽകുക
                </button>
                <button
                  onClick={() => {
                    setLandownerForm((prev) => ({ ...prev, sourceType: 'district', sourceHandlerId: '' }));
                    setIsLandownerModalOpen(true);
                  }}
                  className="flex-1 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold rounded-lg text-center transition"
                >
                  + ഭൂവുടമ പേയ്‌മെന്റ്
                </button>
              </div>
            </div>

            {/* KUPPAM COMMITTEE MAIN TREASURY CARD */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-teal-100 text-teal-700 rounded-lg">
                    <Landmark className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900">കുപ്പം യൂണിറ്റ് കമ്മിറ്റി ഫണ്ട്</h3>
                    <p className="text-xs text-slate-500">ആളുകളുടെ കൈവശമുള്ള തുകയും മെയിൻ ബാലൻസും</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-full">
                  Kuppam Unit
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-xs text-slate-500">ആകെ കുപ്പത്തിന് ലഭിച്ചത്:</span>
                  <div className="text-base font-bold text-slate-800 mt-1">
                    {formatINR(financeData.kuppamCollectedPaise)}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-xs text-slate-500">വ്യക്തികൾക്ക് ഏൽപ്പിച്ചത്:</span>
                  <div className="text-base font-bold text-indigo-700 mt-1">
                    {formatINR(financeData.totalHandedOverToHandlersPaise)}
                  </div>
                </div>
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                  <span className="text-xs font-semibold text-indigo-700">വ്യക്തികളുടെ കൈവശമുള്ള ബാക്കി:</span>
                  <div className="text-base font-bold text-indigo-900 mt-1">
                    {formatINR(financeData.totalBalanceHeldByHandlersPaise)}
                  </div>
                </div>
                <div className="p-3 bg-teal-50 border border-teal-100 rounded-lg">
                  <span className="text-xs font-semibold text-teal-700">കുപ്പത്തിന്റെ ആകെ അവൈലബിൾ ഫണ്ട്:</span>
                  <div className="text-lg font-black text-teal-900 mt-1">
                    {formatINR(financeData.kuppamTotalAvailablePaise)}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setIsHandoverModalOpen(true)}
                  className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg text-center transition"
                >
                  🤝 പണം ഏൽപ്പിക്കുക
                </button>
                <button
                  onClick={() => setActiveTab('kuppam')}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg text-center transition"
                >
                  വ്യക്തികളെ കാണുക ({handlers.length}) →
                </button>
              </div>
            </div>
          </div>

          {/* QUICK SUMMARY OF PEOPLE HOLDING KUPPAM MONEY */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900">കുപ്പം ഫണ്ട് കൈവശമുള്ള വ്യക്തികൾ (Handlers & Accounts)</h3>
                <p className="text-xs text-slate-500">ആരുടെയൊക്കെ കൈവശമാണ് പണം ഉള്ളതെന്നും ഓരോരുത്തരുടെയും ബാലൻസും</p>
              </div>
              <button
                onClick={() => setIsHandlerModalOpen(true)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200"
              >
                <Plus className="w-3.5 h-3.5" /> പുതിയ ആളെ ചേർക്കുക
              </button>
            </div>

            {handlers.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-600 font-medium">ഇതുവരെ ആളുകളെ/അക്കൗണ്ടുകളെ ചേർത്തിട്ടില്ല</p>
                <p className="text-xs text-slate-400 mt-1">കുപ്പത്തിന്റെ പണം കൈവശം വെക്കുന്ന ആളുകളുടെ പേര് ചേർക്കുക (ഉദാ: മൻസൂർക്ക, ബാങ്ക്)</p>
                <button
                  onClick={() => setIsHandlerModalOpen(true)}
                  className="mt-3 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
                >
                  + ആളെ ചേർക്കുക
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {handlers.map((h) => {
                  const stat = financeData.handlerStats[h.id] || {
                    receivedPaise: 0,
                    expensesPaise: 0,
                    landownerPaise: 0,
                    balancePaise: 0,
                  };
                  return (
                    <div
                      key={h.id}
                      className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl hover:border-slate-300 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{h.name}</h4>
                          <span className="text-[11px] text-slate-500">{h.role || 'കമ്മിറ്റി അംഗം'}</span>
                        </div>
                        <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {formatINR(stat.balancePaise)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200/80 text-[11px]">
                        <div>
                          <span className="text-slate-500">കൈപ്പറ്റിയത്:</span>
                          <div className="font-semibold text-slate-800">{formatINR(stat.receivedPaise)}</div>
                        </div>
                        <div>
                          <span className="text-slate-500">ചിലവാക്കിയത്:</span>
                          <div className="font-semibold text-amber-700">{formatINR(stat.expensesPaise)}</div>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3 pt-2">
                        <button
                          onClick={() => {
                            setHandoverForm((prev) => ({ ...prev, targetHandlerId: h.id }));
                            setIsHandoverModalOpen(true);
                          }}
                          className="flex-1 py-1 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded text-center transition"
                        >
                          + പണം നൽകുക
                        </button>
                        <button
                          onClick={() => {
                            setExpenseForm((prev) => ({
                              ...prev,
                              sourceType: 'kuppam_handler',
                              sourceHandlerId: h.id,
                            }));
                            setIsExpenseModalOpen(true);
                          }}
                          className="flex-1 py-1 px-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-bold rounded text-center transition"
                        >
                          + ചിലവ് നൽകുക
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: KUPPAM COMMITTEE & HANDLERS */}
      {activeTab === 'kuppam' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-teal-50 border border-teal-200 p-4 rounded-xl">
            <div>
              <h3 className="font-bold text-teal-950 text-base">കുപ്പം കമ്മിറ്റി ഫണ്ടും വ്യക്തികളും</h3>
              <p className="text-xs text-teal-800 mt-0.5">
                കുപ്പം കളക്ഷനിൽ നിന്ന് ലഭിച്ച ആകെ തുക: <strong>{formatINR(financeData.kuppamCollectedPaise)}</strong>.
                ഇതിൽ നിന്ന് ആർക്കൊക്കെ എത്ര തുക കൈമാറി, ഓരോരുത്തരുടെയും കൈവശം ഇപ്പോൾ എത്ര ബാക്കിയുണ്ട് എന്ന് ഇവിടെ കാണാം.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsHandlerModalOpen(true)}
                className="px-3 py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold rounded-lg shadow-xs transition"
              >
                + പുതിയ വ്യക്തിയെ ചേർക്കുക
              </button>
              <button
                onClick={() => setIsHandoverModalOpen(true)}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition"
              >
                🤝 പണം ഏൽപ്പിക്കുക
              </button>
            </div>
          </div>

          {/* List of Handlers */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {handlers.map((h) => {
              const stat = financeData.handlerStats[h.id] || {
                receivedPaise: 0,
                expensesPaise: 0,
                landownerPaise: 0,
                balancePaise: 0,
              };

              return (
                <div
                  key={h.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-slate-100 text-slate-700 rounded-md">
                          <Users className="w-4 h-4" />
                        </span>
                        <h4 className="font-bold text-slate-900 text-base">{h.name}</h4>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        <span>{h.role || 'കമ്മിറ്റി അംഗം'}</span>
                        {h.phone && <span>• 📞 {h.phone}</span>}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        കൈവശമുള്ള ബാക്കി
                      </span>
                      <span
                        className={`text-lg font-black ${
                          stat.balancePaise > 0 ? 'text-emerald-700' : 'text-slate-700'
                        }`}
                      >
                        {formatINR(stat.balancePaise)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 my-4 text-center">
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">കൈപ്പറ്റിയത്</span>
                      <span className="text-xs font-bold text-slate-800">{formatINR(stat.receivedPaise)}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">ചിലവാക്കിയത്</span>
                      <span className="text-xs font-bold text-amber-700">{formatINR(stat.expensesPaise)}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">ഭൂവുടമയ്ക്ക്</span>
                      <span className="text-xs font-bold text-rose-700">{formatINR(stat.landownerPaise)}</span>
                    </div>
                  </div>

                  {h.notes && <p className="text-xs text-slate-500 italic mb-4">കുറിപ്പ്: {h.notes}</p>}

                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setHandoverForm((prev) => ({ ...prev, targetHandlerId: h.id }));
                        setIsHandoverModalOpen(true);
                      }}
                      className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg text-center transition"
                    >
                      + പണം നൽകുക
                    </button>
                    <button
                      onClick={() => {
                        setExpenseForm((prev) => ({
                          ...prev,
                          sourceType: 'kuppam_handler',
                          sourceHandlerId: h.id,
                        }));
                        setIsExpenseModalOpen(true);
                      }}
                      className="flex-1 py-1.5 px-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg text-center transition"
                    >
                      + ചിലവ് നൽകുക
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: DISTRICT COMMITTEE */}
      {activeTab === 'district' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="p-3 bg-blue-100 text-blue-800 rounded-xl">
                  <Building2 className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">ജില്ലാ കമ്മിറ്റി ഫണ്ട് മാനേജ്‌മെന്റ്</h3>
                  <p className="text-xs text-slate-500">
                    കളക്ഷൻ സമയത്ത് "District Committee" ആയി അടയാളപ്പെടുത്തിയ എല്ലാ തുകകളും ഇവിടെ ഓട്ടോമാറ്റിക്കായി ലഭിക്കുന്നു.
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">നിലവിലെ ബാക്കി</span>
                <span className="text-2xl font-black text-blue-900">{formatINR(financeData.districtBalancePaise)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs font-bold text-slate-500 uppercase">കളക്ഷനിൽ നിന്ന് ലഭിച്ചത്</span>
                <div className="text-xl font-extrabold text-slate-900 mt-1">
                  {formatINR(financeData.districtCollectedPaise)}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">റസീതുകളിൽ 'district' എന്ന് അടയാളപ്പെടുത്തിയത്</p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs font-bold text-amber-700 uppercase">ജില്ലാ ഫണ്ടിൽ നിന്ന് ചിലവഴിച്ചത്</span>
                <div className="text-xl font-extrabold text-amber-800 mt-1">
                  {formatINR(financeData.districtExpensesPaise)}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">ജില്ലാ കമ്മിറ്റി വഹിച്ച ചിലവുകൾ</p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs font-bold text-rose-700 uppercase">ഭൂവുടമയ്ക്ക് നൽകിയത്</span>
                <div className="text-xl font-extrabold text-rose-800 mt-1">
                  {formatINR(financeData.districtLandownerPaise)}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">സ്ഥലത്തിന്റെ ഉടമയ്ക്ക് നേരിട്ട് നൽകിയത്</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setExpenseForm((prev) => ({ ...prev, sourceType: 'district', sourceHandlerId: '' }));
                  setIsExpenseModalOpen(true);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs md:text-sm font-bold rounded-lg shadow-xs transition"
              >
                + ജില്ലാ ചിലവ് രേഖപ്പെടുത്തുക
              </button>
              <button
                onClick={() => {
                  setLandownerForm((prev) => ({ ...prev, sourceType: 'district', sourceHandlerId: '' }));
                  setIsLandownerModalOpen(true);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs md:text-sm font-bold rounded-lg shadow-xs transition"
              >
                + ഭൂവുടമ പേയ്‌മെന്റ് നൽകുക
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TRANSACTION & EXPENSE LEDGER */}
      {(activeTab === 'ledger' || activeTab === 'overview') && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          {/* Header & Filters */}
          <div className="p-4 border-b border-slate-200 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">എല്ലാ ഇടപാടുകളുടെയും കണക്ക് (Transaction Ledger)</h3>
                <p className="text-xs text-slate-500">പണം നൽകൽ, ചിലവുകൾ, ഭൂവുടമ പേയ്‌മെന്റുകൾ എന്നിവയുടെ വിശദാംശങ്ങൾ</p>
              </div>

              <button
                onClick={() => window.print()}
                className="self-start md:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                <Printer className="w-3.5 h-3.5" />
                പ്രിന്റ് / PDF
              </button>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="തിരയുക (പേര്, കാരണം, റെഫറൻസ്)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-emerald-600 focus:bg-white"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-emerald-600"
              >
                <option value="all">എല്ലാ തരങ്ങളും (All Types)</option>
                <option value="handover">പണം ഏൽപ്പിച്ചത് (Handovers)</option>
                <option value="expense">ചിലവുകൾ (Expenses)</option>
                <option value="landowner_payment">ഭൂവുടമ പേയ്‌മെന്റ് (Landowner)</option>
              </select>

              <select
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
                className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-emerald-600"
              >
                <option value="all">എല്ലാ അക്കൗണ്ടുകളും (All Accounts)</option>
                <option value="district">ജില്ലാ കമ്മിറ്റി</option>
                <option value="kuppam_main">കുപ്പം മെയിൻ ഫണ്ട്</option>
                {handlers.map((h) => (
                  <option key={h.id} value={`handler_${h.id}`}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">തീയതി & നമ്പർ</th>
                  <th className="py-3 px-4">ഇടപാട് തരം</th>
                  <th className="py-3 px-4">വിവരണം / കാരണം</th>
                  <th className="py-3 px-4">ഏത് അക്കൗണ്ടിൽ നിന്ന്</th>
                  <th className="py-3 px-4">ആർക്ക് നൽകി</th>
                  <th className="py-3 px-4 text-right">തുക</th>
                  <th className="py-3 px-4 text-center">ആക്ഷൻ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      ഇടപാടുകൾ ഒന്നും കണ്ടെത്തിയില്ല
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => {
                    const isCancelled = r.status === 'cancelled';
                    return (
                      <tr
                        key={r.id}
                        className={`hover:bg-slate-50/70 transition ${
                          isCancelled ? 'opacity-40 line-through bg-rose-50/20' : ''
                        }`}
                      >
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">{r.date}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{r.recordNumber}</div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {r.type === 'handover' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                              🤝 പണം ഏൽപ്പിച്ചത്
                            </span>
                          )}
                          {r.type === 'expense' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              🧾 ചിലവ് ({r.category})
                            </span>
                          )}
                          {r.type === 'landowner_payment' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                              🏛️ ഭൂവുടമ പേയ്‌മെന്റ്
                            </span>
                          )}
                          {isCancelled && (
                            <span className="ml-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-200 text-rose-900">
                              റദ്ദാക്കി
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{r.title}</div>
                          {r.notes && <div className="text-[11px] text-slate-500 mt-0.5">{r.notes}</div>}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-800">{r.sourceHandlerName || '—'}</span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="text-slate-700">{r.targetHandlerName || r.recipient || '—'}</span>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span
                            className={`font-black text-sm ${
                              r.type === 'handover'
                                ? 'text-blue-700'
                                : r.type === 'expense'
                                ? 'text-amber-700'
                                : 'text-rose-700'
                            }`}
                          >
                            {formatINR(r.amountPaise)}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {!isCancelled ? (
                            <button
                              onClick={() => {
                                setCancellingRecord(r);
                                setCancelReason('');
                              }}
                              title="ഈ ഇടപാട് റദ്ദാക്കുക"
                              className="p-1 hover:bg-rose-100 text-rose-600 rounded transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-rose-500 italic">റദ്ദാക്കി</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD KUPPAM HANDLER (PERSON) */}
      {isHandlerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-slate-900 text-base">പുതിയ വ്യക്തിയെ/അക്കൗണ്ട് ചേർക്കുക</h3>
              <button
                onClick={() => setIsHandlerModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddHandler} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  വ്യക്തിയുടെ / അക്കൗണ്ടിന്റെ പേര് *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ഉദാ: മൻസൂർക്ക, റഷീദ്, കുപ്പം ബാങ്ക്"
                  value={handlerForm.name}
                  onChange={(e) => setHandlerForm({ ...handlerForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  സ്ഥാനം / റോൾ (Role)
                </label>
                <input
                  type="text"
                  placeholder="ഉദാ: ഫൈനാൻസ് കൺവീനർ, ട്രഷറർ"
                  value={handlerForm.role}
                  onChange={(e) => setHandlerForm({ ...handlerForm, role: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  ഫോൺ നമ്പർ (Phone)
                </label>
                <input
                  type="tel"
                  placeholder="10-digit mobile"
                  value={handlerForm.phone}
                  onChange={(e) => setHandlerForm({ ...handlerForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  കുറിപ്പ് (Notes)
                </label>
                <textarea
                  rows={2}
                  placeholder="അധിക വിവരങ്ങൾ..."
                  value={handlerForm.notes}
                  onChange={(e) => setHandlerForm({ ...handlerForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsHandlerModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-lg"
                >
                  റദ്ദാക്കുക
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'ചേർക്കുന്നു...' : 'സേവ് ചെയ്യുക'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: HANDOVER MONEY TO PERSON */}
      {isHandoverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-slate-900 text-base">കുപ്പം ഫണ്ടിൽ നിന്ന് പണം ഏൽപ്പിക്കുക</h3>
              <button
                onClick={() => setIsHandoverModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordHandover} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  ആർക്കാണ് പണം നൽകുന്നത്? *
                </label>
                <select
                  required
                  value={handoverForm.targetHandlerId}
                  onChange={(e) => setHandoverForm({ ...handoverForm, targetHandlerId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">വ്യക്തിയെ തിരഞ്ഞെടുക്കുക...</option>
                  {handlers.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.role || 'അംഗം'})
                    </option>
                  ))}
                </select>
                {handlers.length === 0 && (
                  <p className="text-xs text-rose-600 mt-1">
                    വ്യക്തികളെ ചേർത്തിട്ടില്ല. ദയവായി ആദ്യം 'വ്യക്തിയെ ചേർക്കുക' ക്ലിക്ക് ചെയ്യുക.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  ഏൽപ്പിച്ച തുക (Amount in ₹) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="ഉദാ: 50000"
                  value={handoverForm.amountRupees}
                  onChange={(e) => setHandoverForm({ ...handoverForm, amountRupees: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">തീയതി (Date) *</label>
                <input
                  type="date"
                  required
                  value={handoverForm.date}
                  onChange={(e) => setHandoverForm({ ...handoverForm, date: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">കുറിപ്പ് (Notes)</label>
                <textarea
                  rows={2}
                  placeholder="എന്തിനാണ് പണം ഏൽപ്പിച്ചത്..."
                  value={handoverForm.notes}
                  onChange={(e) => setHandoverForm({ ...handoverForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsHandoverModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-lg"
                >
                  റദ്ദാക്കുക
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || handlers.length === 0}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'രേഖപ്പെടുത്തുന്നു...' : 'ഏൽപ്പിച്ചതായി രേഖപ്പെടുത്തുക'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD EXPENSE */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-slate-900 text-base">ചിലവ് രേഖപ്പെടുത്തുക (Add Expense)</h3>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  ഏത് അക്കൗണ്ടിൽ നിന്നാണ് നൽകിയത്? (Paid From) *
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="expenseSource"
                      value="kuppam_handler"
                      checked={expenseForm.sourceType === 'kuppam_handler'}
                      onChange={() => setExpenseForm({ ...expenseForm, sourceType: 'kuppam_handler' })}
                      className="text-amber-600"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900">👤 കുപ്പം കമ്മിറ്റി - വ്യക്തിയുടെ പക്കൽ നിന്ന്</span>
                      <p className="text-[10px] text-slate-500">മൻസൂർക്ക അല്ലെങ്കിൽ മറ്റ് അംഗങ്ങളുടെ കയ്യിൽ നിന്ന്</p>
                    </div>
                  </label>

                  {expenseForm.sourceType === 'kuppam_handler' && (
                    <div className="pl-6 pt-1">
                      <select
                        required
                        value={expenseForm.sourceHandlerId}
                        onChange={(e) => setExpenseForm({ ...expenseForm, sourceHandlerId: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-amber-50/40"
                      >
                        <option value="">വ്യക്തിയെ തിരഞ്ഞെടുക്കുക...</option>
                        {handlers.map((h) => {
                          const bal = financeData.handlerStats[h.id]?.balancePaise || 0;
                          return (
                            <option key={h.id} value={h.id}>
                              {h.name} (കൈവശം: {formatINR(bal)})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  <label className="flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="expenseSource"
                      value="district"
                      checked={expenseForm.sourceType === 'district'}
                      onChange={() => setExpenseForm({ ...expenseForm, sourceType: 'district' })}
                      className="text-amber-600"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900">🏛️ ജില്ലാ കമ്മിറ്റി അക്കൗണ്ട്</span>
                      <p className="text-[10px] text-slate-500">
                        ജില്ലാ ഫണ്ടിൽ നിന്ന് (ലഭ്യമായത്: {formatINR(financeData.districtBalancePaise)})
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="expenseSource"
                      value="kuppam_main"
                      checked={expenseForm.sourceType === 'kuppam_main'}
                      onChange={() => setExpenseForm({ ...expenseForm, sourceType: 'kuppam_main' })}
                      className="text-amber-600"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900">🏢 കുപ്പം മെയിൻ ക്യാഷ്</span>
                      <p className="text-[10px] text-slate-500">നേരിട്ട് കുപ്പം കൗണ്ടർ ഫണ്ടിൽ നിന്ന്</p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  ചിലവിന്റെ കാരണം (Purpose / Title) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ഉദാ: പോസ്റ്റർ പ്രിന്റിംഗ്, ഡോക്യുമെന്റേഷൻ ചിലവ്"
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    തുക (Amount in ₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="10000"
                    value={expenseForm.amountRupees}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amountRupees: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">വിഭാഗം (Category)</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="printing">പ്രിന്റിംഗ് (Printing)</option>
                    <option value="documentation">ഡോക്യുമെന്റേഷൻ (Documentation)</option>
                    <option value="travel">യാത്രാപ്പടി (Travel)</option>
                    <option value="office">ഓഫീസ് ചിലവ് (Office)</option>
                    <option value="other">മറ്റു ചിലവുകൾ (Other)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">തീയതി (Date) *</label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">ആർക്ക് നൽകി (Recipient)</label>
                  <input
                    type="text"
                    placeholder="സ്ഥാപനം / വ്യക്തി"
                    value={expenseForm.recipient}
                    onChange={(e) => setExpenseForm({ ...expenseForm, recipient: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">കുറിപ്പ് (Notes)</label>
                <textarea
                  rows={2}
                  placeholder="ബിൽ നമ്പർ അല്ലെങ്കിൽ കൂടുതൽ വിവരങ്ങൾ..."
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-lg"
                >
                  റദ്ദാക്കുക
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'രേഖപ്പെടുത്തുന്നു...' : 'ചിലവ് സേവ് ചെയ്യുക'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: RECORD LANDOWNER PAYMENT */}
      {isLandownerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-slate-900 text-base">ഭൂവുടമയ്ക്ക് നൽകിയ പേയ്‌മെന്റ്</h3>
              <button
                onClick={() => setIsLandownerModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordLandowner} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  ഏത് അക്കൗണ്ടിൽ നിന്നാണ് നൽകിയത്? *
                </label>
                <select
                  value={landownerForm.sourceType}
                  onChange={(e) =>
                    setLandownerForm({
                      ...landownerForm,
                      sourceType: e.target.value as 'district' | 'kuppam_handler' | 'kuppam_main',
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                >
                  <option value="district">🏛️ ജില്ലാ കമ്മിറ്റി അക്കൗണ്ട്</option>
                  <option value="kuppam_handler">👤 കുപ്പം കമ്മിറ്റി - വ്യക്തിയുടെ കൈവശമുള്ളത്</option>
                  <option value="kuppam_main">🏢 കുപ്പം മെയിൻ ഫണ്ട്</option>
                </select>
              </div>

              {landownerForm.sourceType === 'kuppam_handler' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    ഏത് വ്യക്തിയാണ് നൽകിയത്? *
                  </label>
                  <select
                    required
                    value={landownerForm.sourceHandlerId}
                    onChange={(e) => setLandownerForm({ ...landownerForm, sourceHandlerId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="">വ്യക്തിയെ തിരഞ്ഞെടുക്കുക...</option>
                    {handlers.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  നൽകിയ തുക (Amount in ₹) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="തുക നൽകുക"
                  value={landownerForm.amountRupees}
                  onChange={(e) => setLandownerForm({ ...landownerForm, amountRupees: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">തീയതി (Date) *</label>
                <input
                  type="date"
                  required
                  value={landownerForm.date}
                  onChange={(e) => setLandownerForm({ ...landownerForm, date: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">കുറിപ്പ് (Notes)</label>
                <textarea
                  rows={2}
                  placeholder="റെസീപ്റ്റ് നമ്പർ അല്ലെങ്കിൽ കരാർ വിവരങ്ങൾ..."
                  value={landownerForm.notes}
                  onChange={(e) => setLandownerForm({ ...landownerForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLandownerModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-lg"
                >
                  റദ്ദാക്കുക
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'രേഖപ്പെടുത്തുന്നു...' : 'സേവ് ചെയ്യുക'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: CANCEL RECORD CONFIRMATION */}
      {cancellingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-base text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              ഇടപാട് റദ്ദാക്കുക (Cancel Transaction)
            </h3>
            <p className="text-xs text-slate-600 mt-2">
              <strong>{cancellingRecord.recordNumber}</strong> - {cancellingRecord.title} (
              {formatINR(cancellingRecord.amountPaise)}) റദ്ദാക്കാൻ ആഗ്രഹിക്കുന്നുണ്ടോ? ഇത് റദ്ദാക്കിയാൽ ബാലൻസ്
              പഴയപടിയാകും.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                റദ്ദാക്കാനുള്ള കാരണം (Reason) *
              </label>
              <input
                type="text"
                required
                placeholder="ഉദാ: തെറ്റായി രേഖപ്പെടുത്തിയ തുക..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setCancellingRecord(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg"
              >
                വേണ്ട
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelRecord}
                disabled={isSubmitting || !cancelReason.trim()}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'റദ്ദാക്കുന്നു...' : 'റദ്ദാക്കുക'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
