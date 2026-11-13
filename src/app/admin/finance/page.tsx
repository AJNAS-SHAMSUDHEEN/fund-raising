'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAdminAuth } from '@/lib/state/adminAuth';
import { collection, onSnapshot, query } from 'firebase/firestore';
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
import { generateFinanceReportPDF } from '@/lib/reports/financeReportGenerator';
import {
  Building2,
  Landmark,
  Users,
  Receipt,
  ArrowRightLeft,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Search,
  Printer,
  Download,
  TrendingDown,
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

  // Filter & Search states
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

  // Load Kuppam Handlers & Records
  useEffect(() => {
    const unsubHandlers = subscribeToKuppamHandlers((list) => {
      setHandlers(list);
    });
    const unsubRecords = subscribeToFinanceRecords((list) => {
      setRecords(list);
    });
    return () => {
      unsubHandlers();
      unsubRecords();
    };
  }, []);

  // Compute live calculations
  const financeData = useMemo(() => {
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

    const activeRecords = records.filter((r) => r.status === 'active');

    let districtExpensesPaise = 0;
    let districtLandownerPaise = 0;

    let kuppamMainDirectExpensesPaise = 0;
    let kuppamMainDirectLandownerPaise = 0;

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

    let totalBalanceHeldByHandlersPaise = 0;
    handlers.forEach((h) => {
      const stat = handlerStats[h.id];
      if (stat) {
        stat.balancePaise = stat.receivedPaise - stat.expensesPaise - stat.landownerPaise;
        totalBalanceHeldByHandlersPaise += stat.balancePaise;
      }
    });

    const districtBalancePaise = districtCollectedPaise - districtExpensesPaise - districtLandownerPaise;

    const kuppamMainBalancePaise =
      kuppamCollectedPaise -
      totalHandedOverToHandlersPaise -
      kuppamMainDirectExpensesPaise -
      kuppamMainDirectLandownerPaise;

    const kuppamTotalAvailablePaise = kuppamMainBalancePaise + totalBalanceHeldByHandlersPaise;
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

  // Handle Add Handler
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

  // Handle Handover
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

  // Handle Download Finance Report PDF
  const handleDownloadPDF = () => {
    generateFinanceReportPDF({
      totalCashPaise: financeData.totalCashPaise,
      districtCollectedPaise: financeData.districtCollectedPaise,
      kuppamCollectedPaise: financeData.kuppamCollectedPaise,
      districtExpensesPaise: financeData.districtExpensesPaise,
      districtLandownerPaise: financeData.districtLandownerPaise,
      districtBalancePaise: financeData.districtBalancePaise,
      totalHandedOverToHandlersPaise: financeData.totalHandedOverToHandlersPaise,
      totalBalanceHeldByHandlersPaise: financeData.totalBalanceHeldByHandlersPaise,
      kuppamTotalAvailablePaise: financeData.kuppamTotalAvailablePaise,
      totalExpensesPaise: financeData.totalExpensesPaise,
      totalLandownerPaidPaise: financeData.totalLandownerPaidPaise,
      overallNetBalancePaise: financeData.overallNetBalancePaise,
      handlers,
      handlerStats: financeData.handlerStats,
      records: filteredRecords,
      generatedByName: adminUser?.name || 'Administrator',
    });
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* HEADER */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          borderBottom: '1px solid #E2E8F0',
          paddingBottom: '20px',
          marginBottom: '24px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#E6F4EA',
                color: '#137333',
              }}
            >
              <Landmark size={22} />
            </span>
            <h1
              style={{
                fontSize: '1.6rem',
                fontWeight: 800,
                color: '#0F172A',
                fontFamily: 'var(--font-display)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Finance Management (ധനകാര്യ മാനേജ്‌മെന്റ്)
            </h1>
          </div>
          <p style={{ fontSize: '0.86rem', color: '#64748B', marginTop: '6px', margin: 0 }}>
            കളക്ഷൻ തുകകൾ തത്സമയം നിരീക്ഷിക്കുക, ജില്ലാ & കുപ്പം കമ്മിറ്റി ഫണ്ടുകൾ, വ്യക്തികളുടെ കൈവശമുള്ള തുക, ചിലവുകൾ എന്നിവ കൈകാര്യം ചെയ്യുക.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsHandoverModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 15px',
              background: '#2563EB',
              color: '#FFFFFF',
              fontSize: '0.84rem',
              fontWeight: 700,
              borderRadius: '8px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              cursor: 'pointer',
            }}
          >
            <ArrowRightLeft size={16} />
            <span>പണം ഏൽപ്പിക്കുക</span>
          </button>

          <button
            onClick={() => setIsExpenseModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 15px',
              background: '#D97706',
              color: '#FFFFFF',
              fontSize: '0.84rem',
              fontWeight: 700,
              borderRadius: '8px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              cursor: 'pointer',
            }}
          >
            <Receipt size={16} />
            <span>ചിലവ് രേഖപ്പെടുത്തുക</span>
          </button>

          <button
            onClick={() => setIsLandownerModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 15px',
              background: '#E11D48',
              color: '#FFFFFF',
              fontSize: '0.84rem',
              fontWeight: 700,
              borderRadius: '8px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              cursor: 'pointer',
            }}
          >
            <Building2 size={16} />
            <span>ഭൂവുടമ പേയ്‌മെന്റ്</span>
          </button>

          <button
            onClick={() => setIsHandlerModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 15px',
              background: '#1E293B',
              color: '#FFFFFF',
              fontSize: '0.84rem',
              fontWeight: 700,
              borderRadius: '8px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            <span>വ്യക്തിയെ ചേർക്കുക</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 15px',
              background: '#047857',
              color: '#FFFFFF',
              fontSize: '0.84rem',
              fontWeight: 700,
              borderRadius: '8px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              cursor: 'pointer',
            }}
          >
            <Download size={16} />
            <span>റിപ്പോർട്ട് ഡൗൺലോഡ് (PDF)</span>
          </button>
        </div>
      </div>

      {/* NOTIFICATIONS */}
      {successMessage && (
        <div
          style={{
            padding: '12px 16px',
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            color: '#166534',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} color="#16A34A" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} style={{ cursor: 'pointer', color: '#166534' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            padding: '12px 16px',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} color="#DC2626" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} style={{ cursor: 'pointer', color: '#991B1B' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* TOP 6 KPI METRICS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          marginBottom: '28px',
        }}
      >
        {/* Total Cash Collected */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderTop: '4px solid #059669',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
              ആകെ പിരിവ്
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                background: '#E6F4EA',
                color: '#137333',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              Live Auto
            </span>
          </div>
          <div
            style={{
              fontSize: '1.45rem',
              fontWeight: 900,
              color: '#0F172A',
              fontFamily: 'var(--font-display)',
              marginTop: '6px',
            }}
          >
            {formatINR(financeData.totalCashPaise)}
          </div>
          <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '4px', margin: 0 }}>
            റസീതുകളിൽ നിന്ന് ഓട്ടോമാറ്റിക്കായി
          </p>
        </div>

        {/* District Committee Funds */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderTop: '4px solid #2563EB',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1E40AF', textTransform: 'uppercase' }}>
              ജില്ലാ ഫണ്ട്
            </span>
            <Building2 size={16} color="#2563EB" />
          </div>
          <div
            style={{
              fontSize: '1.45rem',
              fontWeight: 900,
              color: '#1E3A8A',
              fontFamily: 'var(--font-display)',
              marginTop: '6px',
            }}
          >
            {formatINR(financeData.districtBalancePaise)}
          </div>
          <p style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px', margin: 0 }}>
            ലഭിച്ചത്: {formatINR(financeData.districtCollectedPaise)}
          </p>
        </div>

        {/* Kuppam Committee Funds */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderTop: '4px solid #0D9488',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0F766E', textTransform: 'uppercase' }}>
              കുപ്പം ഫണ്ട്
            </span>
            <Landmark size={16} color="#0D9488" />
          </div>
          <div
            style={{
              fontSize: '1.45rem',
              fontWeight: 900,
              color: '#134E4A',
              fontFamily: 'var(--font-display)',
              marginTop: '6px',
            }}
          >
            {formatINR(financeData.kuppamTotalAvailablePaise)}
          </div>
          <p style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px', margin: 0 }}>
            ലഭിച്ചത്: {formatINR(financeData.kuppamCollectedPaise)}
          </p>
        </div>

        {/* Total Handed Over to People */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderTop: '4px solid #4F46E5',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#3730A3', textTransform: 'uppercase' }}>
              ആളുകളുടെ കയ്യിൽ
            </span>
            <Users size={16} color="#4F46E5" />
          </div>
          <div
            style={{
              fontSize: '1.45rem',
              fontWeight: 900,
              color: '#312E81',
              fontFamily: 'var(--font-display)',
              marginTop: '6px',
            }}
          >
            {formatINR(financeData.totalBalanceHeldByHandlersPaise)}
          </div>
          <p style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px', margin: 0 }}>
            {handlers.length} വ്യക്തികൾ / അക്കൗണ്ട്
          </p>
        </div>

        {/* Total Paid to Landowner */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderTop: '4px solid #E11D48',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#9F1239', textTransform: 'uppercase' }}>
              ഭൂവുടമയ്ക്ക്
            </span>
            <TrendingDown size={16} color="#E11D48" />
          </div>
          <div
            style={{
              fontSize: '1.45rem',
              fontWeight: 900,
              color: '#881337',
              fontFamily: 'var(--font-display)',
              marginTop: '6px',
            }}
          >
            {formatINR(financeData.totalLandownerPaidPaise)}
          </div>
          <p style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px', margin: 0 }}>
            ഭൂമി ഏറ്റെടുക്കലിന് നൽകിയത്
          </p>
        </div>

        {/* Total Expenses */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderTop: '4px solid #D97706',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#B45309', textTransform: 'uppercase' }}>
              ആകെ ചിലവുകൾ
            </span>
            <Receipt size={16} color="#D97706" />
          </div>
          <div
            style={{
              fontSize: '1.45rem',
              fontWeight: 900,
              color: '#78350F',
              fontFamily: 'var(--font-display)',
              marginTop: '6px',
            }}
          >
            {formatINR(financeData.totalExpensesPaise)}
          </div>
          <p style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px', margin: 0 }}>
            പ്രിന്റിംഗ് & മറ്റു ചിലവുകൾ
          </p>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid #E2E8F0',
          marginBottom: '24px',
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '10px 18px',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            borderBottom: activeTab === 'overview' ? '3px solid #059669' : '3px solid transparent',
            color: activeTab === 'overview' ? '#065F46' : '#64748B',
            background: activeTab === 'overview' ? '#F0FDF4' : 'transparent',
            borderRadius: '8px 8px 0 0',
            marginBottom: '-2px',
          }}
        >
          🏛️ പ്രധാന അവലോകനം (Overview)
        </button>

        <button
          onClick={() => setActiveTab('kuppam')}
          style={{
            padding: '10px 18px',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            borderBottom: activeTab === 'kuppam' ? '3px solid #0D9488' : '3px solid transparent',
            color: activeTab === 'kuppam' ? '#0F766E' : '#64748B',
            background: activeTab === 'kuppam' ? '#F0FDFA' : 'transparent',
            borderRadius: '8px 8px 0 0',
            marginBottom: '-2px',
          }}
        >
          👥 കുപ്പം കമ്മിറ്റിയും ആളുകളും ({handlers.length})
        </button>

        <button
          onClick={() => setActiveTab('district')}
          style={{
            padding: '10px 18px',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            borderBottom: activeTab === 'district' ? '3px solid #2563EB' : '3px solid transparent',
            color: activeTab === 'district' ? '#1E40AF' : '#64748B',
            background: activeTab === 'district' ? '#EFF6FF' : 'transparent',
            borderRadius: '8px 8px 0 0',
            marginBottom: '-2px',
          }}
        >
          🏛️ ജില്ലാ കമ്മിറ്റി ഫണ്ട്
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          style={{
            padding: '10px 18px',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            borderBottom: activeTab === 'ledger' ? '3px solid #0F172A' : '3px solid transparent',
            color: activeTab === 'ledger' ? '#0F172A' : '#64748B',
            background: activeTab === 'ledger' ? '#F1F5F9' : 'transparent',
            borderRadius: '8px 8px 0 0',
            marginBottom: '-2px',
          }}
        >
          📜 എല്ലാ ഇടപാടുകളുടെയും കണക്ക് ({records.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* TWO MAIN CARDS: DISTRICT vs KUPPAM */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {/* DISTRICT COMMITTEE CARD */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '22px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #F1F5F9',
                  paddingBottom: '14px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      padding: '8px',
                      background: '#DBEAFE',
                      color: '#1D4ED8',
                      borderRadius: '8px',
                      display: 'flex',
                    }}
                  >
                    <Building2 size={20} />
                  </span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                      ജില്ലാ കമ്മിറ്റി അക്കൗണ്ട്
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B' }}>
                      ജില്ലാ കമ്മിറ്റിയുടെ ഫണ്ട് നേരിട്ട് ജില്ലാ അക്കൗണ്ടിൽ
                    </p>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '20px',
                    background: '#EFF6FF',
                    color: '#1D4ED8',
                    border: '1px solid #BFDBFE',
                  }}
                >
                  District Account
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '10px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>കളക്ഷൻ വഴി ലഭിച്ചത്:</span>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginTop: '3px' }}>
                    {formatINR(financeData.districtCollectedPaise)}
                  </div>
                </div>
                <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '10px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>ചിലവാക്കിയ തുക:</span>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#B45309', marginTop: '3px' }}>
                    {formatINR(financeData.districtExpensesPaise)}
                  </div>
                </div>
                <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '10px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>ഭൂവുടമയ്ക്ക് നൽകിയത്:</span>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#E11D48', marginTop: '3px' }}>
                    {formatINR(financeData.districtLandownerPaise)}
                  </div>
                </div>
                <div
                  style={{
                    padding: '12px',
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    borderRadius: '10px',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1E40AF' }}>ജില്ലാ ഫണ്ട് ബാക്കി:</span>
                  <div
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 900,
                      color: '#1E3A8A',
                      fontFamily: 'var(--font-display)',
                      marginTop: '3px',
                    }}
                  >
                    {formatINR(financeData.districtBalancePaise)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    setExpenseForm((prev) => ({ ...prev, sourceType: 'district', sourceHandlerId: '' }));
                    setIsExpenseModalOpen(true);
                  }}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    background: '#F1F5F9',
                    color: '#334155',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  + ചിലവ് നൽകുക
                </button>
                <button
                  onClick={() => {
                    setLandownerForm((prev) => ({ ...prev, sourceType: 'district', sourceHandlerId: '' }));
                    setIsLandownerModalOpen(true);
                  }}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    background: '#FFE4E6',
                    color: '#9F1239',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  + ഭൂവുടമ പേയ്‌മെന്റ്
                </button>
              </div>
            </div>

            {/* KUPPAM COMMITTEE MAIN TREASURY CARD */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '22px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #F1F5F9',
                  paddingBottom: '14px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      padding: '8px',
                      background: '#CCFBF1',
                      color: '#0F766E',
                      borderRadius: '8px',
                      display: 'flex',
                    }}
                  >
                    <Landmark size={20} />
                  </span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                      കുപ്പം യൂണിറ്റ് കമ്മിറ്റി ഫണ്ട്
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B' }}>
                      ആളുകളുടെ കൈവശമുള്ള തുകയും മെയിൻ ബാലൻസും
                    </p>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '20px',
                    background: '#F0FDFA',
                    color: '#0F766E',
                    border: '1px solid #99F6E4',
                  }}
                >
                  Kuppam Unit
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '10px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>ആകെ കുപ്പത്തിന് ലഭിച്ചത്:</span>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginTop: '3px' }}>
                    {formatINR(financeData.kuppamCollectedPaise)}
                  </div>
                </div>
                <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '10px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>വ്യക്തികൾക്ക് ഏൽപ്പിച്ചത്:</span>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#4338CA', marginTop: '3px' }}>
                    {formatINR(financeData.totalHandedOverToHandlersPaise)}
                  </div>
                </div>
                <div
                  style={{
                    padding: '12px',
                    background: '#EEF2FF',
                    border: '1px solid #C7D2FE',
                    borderRadius: '10px',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3730A3' }}>
                    വ്യക്തികളുടെ കൈവശമുള്ള ബാക്കി:
                  </span>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#312E81', marginTop: '3px' }}>
                    {formatINR(financeData.totalBalanceHeldByHandlersPaise)}
                  </div>
                </div>
                <div
                  style={{
                    padding: '12px',
                    background: '#F0FDFA',
                    border: '1px solid #99F6E4',
                    borderRadius: '10px',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F766E' }}>
                    കുപ്പത്തിന്റെ ആകെ അവൈലബിൾ ഫണ്ട്:
                  </span>
                  <div
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 900,
                      color: '#134E4A',
                      fontFamily: 'var(--font-display)',
                      marginTop: '3px',
                    }}
                  >
                    {formatINR(financeData.kuppamTotalAvailablePaise)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setIsHandoverModalOpen(true)}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    background: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  🤝 പണം ഏൽപ്പിക്കുക
                </button>
                <button
                  onClick={() => setActiveTab('kuppam')}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    background: '#F1F5F9',
                    color: '#334155',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  വ്യക്തികളെ കാണുക ({handlers.length}) →
                </button>
              </div>
            </div>
          </div>

          {/* QUICK SUMMARY OF PEOPLE HOLDING KUPPAM MONEY */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '22px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '18px',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                  കുപ്പം ഫണ്ട് കൈവശമുള്ള വ്യക്തികൾ (Handlers & Accounts)
                </h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>
                  ആരുടെയൊക്കെ കൈവശമാണ് പണം ഉള്ളതെന്നും ഓരോരുത്തരുടെയും ബാലൻസും
                </p>
              </div>
              <button
                onClick={() => setIsHandlerModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#065F46',
                  background: '#ECFDF5',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #A7F3D0',
                  cursor: 'pointer',
                }}
              >
                <Plus size={14} /> പുതിയ ആളെ ചേർക്കുക
              </button>
            </div>

            {handlers.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '36px 16px',
                  border: '1.5px dashed #CBD5E1',
                  borderRadius: '12px',
                }}
              >
                <Users size={36} color="#94A3B8" style={{ margin: '0 auto 10px' }} />
                <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#475569', margin: 0 }}>
                  ഇതുവരെ ആളുകളെ/അക്കൗണ്ടുകളെ ചേർത്തിട്ടില്ല
                </p>
                <p style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '4px', marginBottom: '14px' }}>
                  കുപ്പത്തിന്റെ പണം കൈവശം വെക്കുന്ന ആളുകളുടെ പേര് ചേർക്കുക (ഉദാ: മൻസൂർക്ക, ബാങ്ക്)
                </p>
                <button
                  onClick={() => setIsHandlerModalOpen(true)}
                  style={{
                    padding: '8px 16px',
                    background: '#059669',
                    color: '#FFFFFF',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  + ആളെ ചേർക്കുക
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '14px',
                }}
              >
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
                      style={{
                        padding: '16px',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>
                            {h.name}
                          </h4>
                          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>{h.role || 'കമ്മിറ്റി അംഗം'}</span>
                        </div>
                        <span
                          style={{
                            fontSize: '0.84rem',
                            fontWeight: 900,
                            padding: '3px 8px',
                            borderRadius: '20px',
                            background: '#E6F4EA',
                            color: '#137333',
                            border: '1px solid #CEEAD6',
                          }}
                        >
                          {formatINR(stat.balancePaise)}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                          marginTop: '12px',
                          paddingTop: '10px',
                          borderTop: '1px solid #E2E8F0',
                          fontSize: '0.75rem',
                        }}
                      >
                        <div>
                          <span style={{ color: '#64748B' }}>കൈപ്പറ്റിയത്:</span>
                          <div style={{ fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                            {formatINR(stat.receivedPaise)}
                          </div>
                        </div>
                        <div>
                          <span style={{ color: '#64748B' }}>ചിലവാക്കിയത്:</span>
                          <div style={{ fontWeight: 700, color: '#B45309', marginTop: '2px' }}>
                            {formatINR(stat.expensesPaise)}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                        <button
                          onClick={() => {
                            setHandoverForm((prev) => ({ ...prev, targetHandlerId: h.id }));
                            setIsHandoverModalOpen(true);
                          }}
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            background: '#EFF6FF',
                            color: '#1D4ED8',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            textAlign: 'center',
                          }}
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
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            background: '#FEF3C7',
                            color: '#B45309',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            textAlign: 'center',
                          }}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              background: '#F0FDFA',
              border: '1px solid #CCFBF1',
              padding: '16px 20px',
              borderRadius: '12px',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#134E4A' }}>
                കുപ്പം കമ്മിറ്റി ഫണ്ടും വ്യക്തികളും
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#0F766E' }}>
                കുപ്പം കളക്ഷനിൽ നിന്ന് ലഭിച്ച ആകെ തുക: <strong>{formatINR(financeData.kuppamCollectedPaise)}</strong>.
                ഇതിൽ നിന്ന് ആർക്കൊക്കെ എത്ര തുക കൈമാറി, ഓരോരുത്തരുടെയും കൈവശം ഇപ്പോൾ എത്ര ബാക്കിയുണ്ട് എന്ന് ഇവിടെ കാണാം.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setIsHandlerModalOpen(true)}
                style={{
                  padding: '8px 14px',
                  background: '#0F766E',
                  color: '#FFFFFF',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                + പുതിയ വ്യക്തിയെ ചേർക്കുക
              </button>
              <button
                onClick={() => setIsHandoverModalOpen(true)}
                style={{
                  padding: '8px 14px',
                  background: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                🤝 പണം ഏൽപ്പിക്കുക
              </button>
            </div>
          </div>

          {/* List of Handlers Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
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
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '14px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid #F1F5F9',
                      paddingBottom: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            padding: '6px',
                            background: '#F1F5F9',
                            color: '#475569',
                            borderRadius: '6px',
                            display: 'flex',
                          }}
                        >
                          <Users size={16} />
                        </span>
                        <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0F172A' }}>
                          {h.name}
                        </h4>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>
                        {h.role || 'കമ്മിറ്റി അംഗം'} {h.phone && `• 📞 ${h.phone}`}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          color: '#64748B',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          display: 'block',
                        }}
                      >
                        കൈവശമുള്ള ബാക്കി
                      </span>
                      <span
                        style={{
                          fontSize: '1.2rem',
                          fontWeight: 900,
                          color: stat.balancePaise > 0 ? '#15803D' : '#334155',
                          fontFamily: 'var(--font-display)',
                        }}
                      >
                        {formatINR(stat.balancePaise)}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '8px',
                      margin: '14px 0',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ padding: '8px', background: '#F8FAFC', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase', display: 'block' }}>
                        കൈപ്പറ്റിയത്
                      </span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>
                        {formatINR(stat.receivedPaise)}
                      </span>
                    </div>
                    <div style={{ padding: '8px', background: '#F8FAFC', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase', display: 'block' }}>
                        ചിലവാക്കിയത്
                      </span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#B45309' }}>
                        {formatINR(stat.expensesPaise)}
                      </span>
                    </div>
                    <div style={{ padding: '8px', background: '#F8FAFC', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase', display: 'block' }}>
                        ഭൂവുടമയ്ക്ക്
                      </span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#E11D48' }}>
                        {formatINR(stat.landownerPaise)}
                      </span>
                    </div>
                  </div>

                  {h.notes && (
                    <p style={{ fontSize: '0.75rem', color: '#64748B', fontStyle: 'italic', marginBottom: '14px' }}>
                      കുറിപ്പ്: {h.notes}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
                    <button
                      onClick={() => {
                        setHandoverForm((prev) => ({ ...prev, targetHandlerId: h.id }));
                        setIsHandoverModalOpen(true);
                      }}
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: '#2563EB',
                        color: '#FFFFFF',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
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
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: '#D97706',
                        color: '#FFFFFF',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #F1F5F9',
                paddingBottom: '16px',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span
                  style={{
                    padding: '10px',
                    background: '#DBEAFE',
                    color: '#1D4ED8',
                    borderRadius: '10px',
                    display: 'flex',
                  }}
                >
                  <Building2 size={24} />
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                    ജില്ലാ കമ്മിറ്റി ഫണ്ട് മാനേജ്‌മെന്റ്
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                    കളക്ഷൻ സമയത്ത് "District Committee" ആയി അടയാളപ്പെടുത്തിയ എല്ലാ തുകകളും ഇവിടെ ഓട്ടോമാറ്റിക്കായി ലഭിക്കുന്നു.
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: '#64748B',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    display: 'block',
                  }}
                >
                  നിലവിലെ ബാക്കി
                </span>
                <span
                  style={{
                    fontSize: '1.6rem',
                    fontWeight: 900,
                    color: '#1E3A8A',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {formatINR(financeData.districtBalancePaise)}
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px',
                marginBottom: '22px',
              }}
            >
              <div
                style={{
                  padding: '16px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                  കളക്ഷനിൽ നിന്ന് ലഭിച്ചത്
                </span>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                  {formatINR(financeData.districtCollectedPaise)}
                </div>
                <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '4px', margin: 0 }}>
                  റസീതുകളിൽ 'district' എന്ന് അടയാളപ്പെടുത്തിയത്
                </p>
              </div>

              <div
                style={{
                  padding: '16px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#B45309', textTransform: 'uppercase' }}>
                  ജില്ലാ ഫണ്ടിൽ നിന്ന് ചിലവഴിച്ചത്
                </span>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#B45309', marginTop: '4px' }}>
                  {formatINR(financeData.districtExpensesPaise)}
                </div>
                <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '4px', margin: 0 }}>
                  ജില്ലാ കമ്മിറ്റി വഹിച്ച ചിലവുകൾ
                </p>
              </div>

              <div
                style={{
                  padding: '16px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#9F1239', textTransform: 'uppercase' }}>
                  ഭൂവുടമയ്ക്ക് നൽകിയത്
                </span>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#E11D48', marginTop: '4px' }}>
                  {formatINR(financeData.districtLandownerPaise)}
                </div>
                <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '4px', margin: 0 }}>
                  സ്ഥലത്തിന്റെ ഉടമയ്ക്ക് നേരിട്ട് നൽകിയത്
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setExpenseForm((prev) => ({ ...prev, sourceType: 'district', sourceHandlerId: '' }));
                  setIsExpenseModalOpen(true);
                }}
                style={{
                  padding: '9px 16px',
                  background: '#D97706',
                  color: '#FFFFFF',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                + ജില്ലാ ചിലവ് രേഖപ്പെടുത്തുക
              </button>
              <button
                onClick={() => {
                  setLandownerForm((prev) => ({ ...prev, sourceType: 'district', sourceHandlerId: '' }));
                  setIsLandownerModalOpen(true);
                }}
                style={{
                  padding: '9px 16px',
                  background: '#E11D48',
                  color: '#FFFFFF',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                + ഭൂവുടമ പേയ്‌മെന്റ് നൽകുക
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TRANSACTION & EXPENSE LEDGER */}
      {(activeTab === 'ledger' || activeTab === 'overview') && (
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            overflow: 'hidden',
          }}
        >
          {/* Header & Filters */}
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #E2E8F0' }}>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: '14px',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                  എല്ലാ ഇടപാടുകളുടെയും കണക്ക് (Transaction Ledger)
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                  പണം നൽകൽ, ചിലവുകൾ, ഭൂവുടമ പേയ്‌മെന്റുകൾ എന്നിവയുടെ വിശദാംശങ്ങൾ
                </p>
              </div>

              <button
                onClick={handleDownloadPDF}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  background: '#047857',
                  color: '#FFFFFF',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                <Download size={15} />
                <span>ഡൗൺലോഡ് റിപ്പോർട്ട് (PDF)</span>
              </button>
            </div>

            {/* Filter controls */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <Search
                  size={15}
                  color="#94A3B8"
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  placeholder="തിരയുക (പേര്, കാരണം, റെഫറൻസ്)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    paddingLeft: '32px',
                    paddingRight: '12px',
                    paddingTop: '7px',
                    paddingBottom: '7px',
                    fontSize: '0.8rem',
                    background: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                  }}
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  padding: '7px 12px',
                  fontSize: '0.8rem',
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                <option value="all">എല്ലാ തരങ്ങളും (All Types)</option>
                <option value="handover">പണം ഏൽപ്പിച്ചത് (Handovers)</option>
                <option value="expense">ചിലവുകൾ (Expenses)</option>
                <option value="landowner_payment">ഭൂവുടമ പേയ്‌മെന്റ് (Landowner)</option>
              </select>

              <select
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
                style={{
                  padding: '7px 12px',
                  fontSize: '0.8rem',
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
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
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr
                  style={{
                    background: '#F8FAFC',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    color: '#64748B',
                    fontWeight: 800,
                    borderBottom: '1px solid #E2E8F0',
                  }}
                >
                  <th style={{ padding: '12px 16px' }}>തീയതി & നമ്പർ</th>
                  <th style={{ padding: '12px 16px' }}>ഇടപാട് തരം</th>
                  <th style={{ padding: '12px 16px' }}>വിവരണം / കാരണം</th>
                  <th style={{ padding: '12px 16px' }}>ഏത് അക്കൗണ്ടിൽ നിന്ന്</th>
                  <th style={{ padding: '12px 16px' }}>ആർക്ക് നൽകി</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>തുക</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>റദ്ദാക്കുക</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#94A3B8' }}>
                      ഇടപാടുകൾ ഒന്നും കണ്ടെത്തിയില്ല
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => {
                    const isCancelled = r.status === 'cancelled';
                    return (
                      <tr
                        key={r.id}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          textDecoration: isCancelled ? 'line-through' : 'none',
                          opacity: isCancelled ? 0.45 : 1,
                          background: isCancelled ? '#FEF2F2' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>{r.date}</div>
                          <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontFamily: 'monospace' }}>
                            {r.recordNumber}
                          </div>
                        </td>

                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          {r.type === 'handover' && (
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: '#DBEAFE',
                                color: '#1E40AF',
                              }}
                            >
                              🤝 പണം ഏൽപ്പിച്ചത്
                            </span>
                          )}
                          {r.type === 'expense' && (
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: '#FEF3C7',
                                color: '#B45309',
                              }}
                            >
                              🧾 ചിലവ് ({r.category})
                            </span>
                          )}
                          {r.type === 'landowner_payment' && (
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: '#FFE4E6',
                                color: '#9F1239',
                              }}
                            >
                              🏛️ ഭൂവുടമ പേയ്‌മെന്റ്
                            </span>
                          )}
                          {isCancelled && (
                            <span
                              style={{
                                marginLeft: '6px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                background: '#FEE2E2',
                                color: '#991B1B',
                              }}
                            >
                              റദ്ദാക്കി
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>{r.title}</div>
                          {r.notes && <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>{r.notes}</div>}
                        </td>

                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontWeight: 600, color: '#334155' }}>
                          {r.sourceHandlerName || '—'}
                        </td>

                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: '#334155' }}>
                          {r.targetHandlerName || r.recipient || '—'}
                        </td>

                        <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              fontSize: '0.92rem',
                              fontWeight: 900,
                              fontFamily: 'var(--font-display)',
                              color:
                                r.type === 'handover'
                                  ? '#1D4ED8'
                                  : r.type === 'expense'
                                  ? '#B45309'
                                  : '#BE123C',
                            }}
                          >
                            {formatINR(r.amountPaise)}
                          </span>
                        </td>

                        <td style={{ padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {!isCancelled ? (
                            <button
                              onClick={() => {
                                setCancellingRecord(r);
                                setCancelReason('');
                              }}
                              title="ഈ ഇടപാട് റദ്ദാക്കുക"
                              style={{
                                padding: '5px',
                                color: '#DC2626',
                                background: '#FEE2E2',
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#DC2626', fontStyle: 'italic' }}>റദ്ദാക്കി</span>
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
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(3px)',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #F1F5F9',
                paddingBottom: '12px',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                പുതിയ വ്യക്തിയെ/അക്കൗണ്ട് ചേർക്കുക
              </h3>
              <button
                onClick={() => setIsHandlerModalOpen(false)}
                style={{ cursor: 'pointer', color: '#94A3B8', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddHandler} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                  വ്യക്തിയുടെ / അക്കൗണ്ടിന്റെ പേര് *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ഉദാ: മൻസൂർക്ക, റഷീദ്, കുപ്പം ബാങ്ക്"
                  value={handlerForm.name}
                  onChange={(e) => setHandlerForm({ ...handlerForm, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '0.88rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                  സ്ഥാനം / റോൾ (Role)
                </label>
                <input
                  type="text"
                  placeholder="ഉദാ: ഫൈനാൻസ് കൺവീനർ, ട്രഷറർ"
                  value={handlerForm.role}
                  onChange={(e) => setHandlerForm({ ...handlerForm, role: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '0.88rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                  ഫോൺ നമ്പർ (Phone)
                </label>
                <input
                  type="tel"
                  placeholder="10-digit mobile"
                  value={handlerForm.phone}
                  onChange={(e) => setHandlerForm({ ...handlerForm, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '0.88rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                  കുറിപ്പ് (Notes)
                </label>
                <textarea
                  rows={2}
                  placeholder="അധിക വിവരങ്ങൾ..."
                  value={handlerForm.notes}
                  onChange={(e) => setHandlerForm({ ...handlerForm, notes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '0.88rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', paddingTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsHandlerModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#F1F5F9',
                    color: '#334155',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  റദ്ദാക്കുക
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#059669',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    opacity: isSubmitting ? 0.6 : 1,
                  }}
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
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(3px)',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #F1F5F9',
                paddingBottom: '12px',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                കുപ്പം ഫണ്ടിൽ നിന്ന് പണം ഏൽപ്പിക്കുക
              </h3>
              <button
                onClick={() => setIsHandoverModalOpen(false)}
                style={{ cursor: 'pointer', color: '#94A3B8', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordHandover} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                  ആർക്കാണ് പണം നൽകുന്നത്? *
                </label>
                <select
                  required
                  value={handoverForm.targetHandlerId}
                  onChange={(e) => setHandoverForm({ ...handoverForm, targetHandlerId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '0.88rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">വ്യക്തിയെ തിരഞ്ഞെടുക്കുക...</option>
                  {handlers.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.role || 'അംഗം'})
                    </option>
                  ))}
                </select>
                {handlers.length === 0 && (
                  <p style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: '4px', margin: 0 }}>
                    വ്യക്തികളെ ചേർത്തിട്ടില്ല. ദയവായി ആദ്യം 'വ്യക്തിയെ ചേർക്കുക' ക്ലിക്ക് ചെയ്യുക.
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                  ഏൽപ്പിച്ച തുക (Amount in ₹) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="ഉദാ: 50000"
                  value={handoverForm.amountRupees}
                  onChange={(e) => setHandoverForm({ ...handoverForm, amountRupees: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                  തീയതി (Date) *
                </label>
                <input
                  type="date"
                  required
                  value={handoverForm.date}
                  onChange={(e) => setHandoverForm({ ...handoverForm, date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '0.88rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                  കുറിപ്പ് (Notes)
                </label>
                <textarea
                  rows={2}
                  placeholder="എന്തിനാണ് പണം ഏൽപ്പിച്ചത്..."
                  value={handoverForm.notes}
                  onChange={(e) => setHandoverForm({ ...handoverForm, notes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '0.88rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', paddingTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsHandoverModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#F1F5F9',
                    color: '#334155',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  റദ്ദാക്കുക
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || handlers.length === 0}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#2563EB',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    opacity: isSubmitting || handlers.length === 0 ? 0.6 : 1,
                  }}
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
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(3px)',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #F1F5F9',
                paddingBottom: '12px',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                ചിലവ് രേഖപ്പെടുത്തുക (Add Expense)
              </h3>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                style={{ cursor: 'pointer', color: '#94A3B8', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordExpense} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>
                  ഏത് അക്കൗണ്ടിൽ നിന്നാണ് നൽകിയത്? (Paid From) *
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      padding: '10px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      background: expenseForm.sourceType === 'kuppam_handler' ? '#FEF3C7' : '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="expenseSource"
                      value="kuppam_handler"
                      checked={expenseForm.sourceType === 'kuppam_handler'}
                      onChange={() => setExpenseForm({ ...expenseForm, sourceType: 'kuppam_handler' })}
                      style={{ marginTop: '2px' }}
                    />
                    <div style={{ fontSize: '0.8rem' }}>
                      <span style={{ fontWeight: 800, color: '#0F172A' }}>👤 കുപ്പം കമ്മിറ്റി - വ്യക്തിയുടെ പക്കൽ നിന്ന്</span>
                      <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#64748B' }}>
                        മൻസൂർക്ക അല്ലെങ്കിൽ മറ്റ് അംഗങ്ങളുടെ കയ്യിൽ നിന്ന്
                      </p>
                    </div>
                  </label>

                  {expenseForm.sourceType === 'kuppam_handler' && (
                    <div style={{ paddingLeft: '24px' }}>
                      <select
                        required
                        value={expenseForm.sourceHandlerId}
                        onChange={(e) => setExpenseForm({ ...expenseForm, sourceHandlerId: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          fontSize: '0.82rem',
                          border: '1px solid #F59E0B',
                          borderRadius: '8px',
                          background: '#FFFBEB',
                          cursor: 'pointer',
                        }}
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

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      padding: '10px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      background: expenseForm.sourceType === 'district' ? '#DBEAFE' : '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="expenseSource"
                      value="district"
                      checked={expenseForm.sourceType === 'district'}
                      onChange={() => setExpenseForm({ ...expenseForm, sourceType: 'district' })}
                      style={{ marginTop: '2px' }}
                    />
                    <div style={{ fontSize: '0.8rem' }}>
                      <span style={{ fontWeight: 800, color: '#0F172A' }}>🏛️ ജില്ലാ കമ്മിറ്റി അക്കൗണ്ട്</span>
                      <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#64748B' }}>
                        ജില്ലാ ഫണ്ടിൽ നിന്ന് (ലഭ്യമായത്: {formatINR(financeData.districtBalancePaise)})
                      </p>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      padding: '10px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      background: expenseForm.sourceType === 'kuppam_main' ? '#F1F5F9' : '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="expenseSource"
                      value="kuppam_main"
                      checked={expenseForm.sourceType === 'kuppam_main'}
                      onChange={() => setExpenseForm({ ...expenseForm, sourceType: 'kuppam_main' })}
                      style={{ marginTop: '2px' }}
                    />
                    <div style={{ fontSize: '0.8rem' }}>
                      <span style={{ fontWeight: 800, color: '#0F172A' }}>🏢 കുപ്പം മെയിൻ ക്യാഷ്</span>
                      <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#64748B' }}>
                        നേരിട്ട് കുപ്പം കൗണ്ടർ ഫണ്ടിൽ നിന്ന്
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                  ചിലവിന്റെ കാരണം (Purpose / Title) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ഉദാ: പോസ്റ്റർ പ്രിന്റിംഗ്, ഡോക്യുമെന്റേഷൻ ചിലവ്"
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '0.88rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                    തുക (Amount in ₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="10000"
                    value={expenseForm.amountRupees}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amountRupees: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '1rem',
                      fontWeight: 800,
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                    വിഭാഗം (Category)
                  </label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '0.88rem',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="printing">പ്രിന്റിംഗ് (Printing)</option>
                    <option value="documentation">ഡോക്യുമെന്റേഷൻ (Documentation)</option>
                    <option value="travel">യാത്രാപ്പടി (Travel)</option>
                    <option value="office">ഓഫീസ് ചിലവ് (Office)</option>
                    <option value="other">മറ്റു ചിലവുകൾ (Other)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                    തീയതി (Date) *
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '0.88rem',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                    ആർക്ക് നൽകി (Recipient)
                  </label>
                  <input
                    type="text"
                    placeholder="സ്ഥാപനം / വ്യക്തി"
                    value={expenseForm.recipient}
                    onChange={(e) => setExpenseForm({ ...expenseForm, recipient: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '0.88rem',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                  കുറിപ്പ് (Notes)
                </label>
                <textarea
                  rows={2}
                  placeholder="ബിൽ നമ്പർ അല്ലെങ്കിൽ കൂടുതൽ വിവരങ്ങൾ..."
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '0.88rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', paddingTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#F1F5F9',
                    color: '#334155',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  റദ്ദാക്കുക
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#D97706',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    opacity: isSubmitting ? 0.6 : 1,
                  }}
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
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(3px)',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #F1F5F9',
                paddingBottom: '12px',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                ഭൂവുടമയ്ക്ക് നൽകിയ പേയ്‌മെന്റ്
              </h3>
              <button
                onClick={() => setIsLandownerModalOpen(false)}
                style={{ cursor: 'pointer', color: '#94A3B8', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordLandowner} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
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
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '0.88rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <option value="district">🏛️ ജില്ലാ കമ്മിറ്റി അക്കൗണ്ട്</option>
                  <option value="kuppam_handler">👤 കുപ്പം കമ്മിറ്റി - വ്യക്തിയുടെ കൈവശമുള്ളത്</option>
                  <option value="kuppam_main">🏢 കുപ്പം മെയിൻ ഫണ്ട്</option>
                </select>
              </div>

              {landownerForm.sourceType === 'kuppam_handler' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                    ഏത് വ്യക്തിയാണ് നൽകിയത്? *
                  </label>
                  <select
                    required
                    value={landownerForm.sourceHandlerId}
                    onChange={(e) => setLandownerForm({ ...landownerForm, sourceHandlerId: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '0.88rem',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
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
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                  നൽകിയ തുക (Amount in ₹) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="തുക നൽകുക"
                  value={landownerForm.amountRupees}
                  onChange={(e) => setLandownerForm({ ...landownerForm, amountRupees: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                  തീയതി (Date) *
                </label>
                <input
                  type="date"
                  required
                  value={landownerForm.date}
                  onChange={(e) => setLandownerForm({ ...landownerForm, date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '0.88rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                  കുറിപ്പ് (Notes)
                </label>
                <textarea
                  rows={2}
                  placeholder="റെസീപ്റ്റ് നമ്പർ അല്ലെങ്കിൽ കരാർ വിവരങ്ങൾ..."
                  value={landownerForm.notes}
                  onChange={(e) => setLandownerForm({ ...landownerForm, notes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '0.88rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', paddingTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsLandownerModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#F1F5F9',
                    color: '#334155',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  റദ്ദാക്കുക
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#E11D48',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    opacity: isSubmitting ? 0.6 : 1,
                  }}
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
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(3px)',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: '1.05rem',
                fontWeight: 800,
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={20} color="#DC2626" />
              ഇടപാട് റദ്ദാക്കുക (Cancel Transaction)
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#475569', marginTop: '8px', marginBottom: '16px' }}>
              <strong>{cancellingRecord.recordNumber}</strong> - {cancellingRecord.title} (
              {formatINR(cancellingRecord.amountPaise)}) റദ്ദാക്കാൻ ആഗ്രഹിക്കുന്നുണ്ടോ? ഇത് റദ്ദാക്കിയാൽ ബാലൻസ്
              പഴയപടിയാകും.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                റദ്ദാക്കാനുള്ള കാരണം (Reason) *
              </label>
              <input
                type="text"
                required
                placeholder="ഉദാ: തെറ്റായി രേഖപ്പെടുത്തിയ തുക..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '0.84rem',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setCancellingRecord(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#F1F5F9',
                  color: '#334155',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                വേണ്ട
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelRecord}
                disabled={isSubmitting || !cancelReason.trim()}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  opacity: isSubmitting || !cancelReason.trim() ? 0.6 : 1,
                }}
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
