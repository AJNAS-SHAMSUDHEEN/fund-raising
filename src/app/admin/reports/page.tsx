'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAdminAuth } from '@/lib/state/adminAuth';
import { formatINRFromPaise } from '@/lib/calculations/currency';
import {
  generateCampaignPdf,
  exportReportToCsv,
  ReportItem,
  ReportSummary,
  ReportFilterOptions,
} from '@/lib/reports/reportGenerator';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  Search,
  CheckCircle2,
  Coins,
  TrendingUp,
  RefreshCw,
  FileSpreadsheet,
  AlertCircle,
  Users,
  Building,
  Building2,
  ShieldCheck,
} from 'lucide-react';

type DatePreset = 'all' | 'today' | 'week' | 'month' | 'custom';

export default function AdminReportsPage() {
  const { adminUser } = useAdminAuth();
  const [allOffers, setAllOffers] = useState<any[]>([]);
  const [allCash, setAllCash] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Filters
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'cash' | 'offer'>('all');
  const [receivingFilter, setReceivingFilter] = useState<'all' | 'unit' | 'district' | 'external'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch live data from Firestore
  useEffect(() => {
    setIsLoading(true);

    const unsubOffers = onSnapshot(
      query(collection(db, 'offers'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setAllOffers(docs);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching offers for reports:', err);
        setIsLoading(false);
      }
    );

    const unsubCash = onSnapshot(
      query(collection(db, 'cashCollections'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setAllCash(docs);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching cash collections for reports:', err);
        setIsLoading(false);
      }
    );

    return () => {
      unsubOffers();
      unsubCash();
    };
  }, []);

  // 2. Normalize items into unified ReportItem structure
  const rawReportItems = useMemo<ReportItem[]>(() => {
    const list: ReportItem[] = [];

    // Map of offers by ID and offerNumber for quick lookup
    const offerMap = new Map<string, any>();
    allOffers.forEach((o) => {
      offerMap.set(o.id, o);
      if (o.offerNumber) offerMap.set(o.offerNumber, o);
    });

    // Map Offers
    allOffers.forEach((o) => {
      let time = Date.now();
      let dateStr = 'Recent';
      if (o.createdAt?.toDate) {
        const d = o.createdAt.toDate();
        time = d.getTime();
        dateStr = d.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }

      const totalOffered = o.totalOfferedPaise || 0;
      const paid = o.paidPaise || 0;
      const remaining = Math.max(0, totalOffered - paid);
      let derivedStatus = o.status || 'pledged';
      if (derivedStatus !== 'cancelled') {
        if (paid >= totalOffered && totalOffered > 0) {
          derivedStatus = 'verified';
        } else if (paid > 0 && paid < totalOffered) {
          derivedStatus = 'partial';
        }
      }

      list.push({
        id: o.id,
        referenceNumber: o.offerNumber || `OFF-${o.id.substring(0, 6).toUpperCase()}`,
        date: dateStr,
        timestamp: time,
        contributorName: o.contributorName || 'Anonymous Donor',
        phone: o.contributorPhone || '',
        place: o.contributorPlace || '',
        hasNoPhone: Boolean(o.hasNoPhone || !o.contributorPhone),
        receivingEntity: o.receivingEntity || 'unit',
        receivingEntityName: o.receivingEntityName || '',
        type: 'offer',
        category: o.offerType || 'cash',
        quantity: o.quantity || 1,
        collectorOrVenue: o.eventName || 'General Campaign',
        status: derivedStatus,
        amountPaise: totalOffered,
        paidPaise: paid,
        remainingPaise: remaining,
      });
    });

    // Map Cash Collections
    allCash.forEach((c) => {
      let time = Date.now();
      let dateStr = 'Recent';
      if (c.createdAt?.toDate) {
        const d = c.createdAt.toDate();
        time = d.getTime();
        dateStr = d.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }

      const parentOffer = c.offerId ? offerMap.get(c.offerId) : null;
      const linkedOfferRef = parentOffer
        ? (parentOffer.offerNumber || `OFF-${parentOffer.id.substring(0, 6).toUpperCase()}`)
        : (c.offerId ? c.offerId : undefined);

      list.push({
        id: c.id,
        referenceNumber: c.receiptNumber || `REC-${c.id.substring(0, 6).toUpperCase()}`,
        date: dateStr,
        timestamp: time,
        contributorName: c.contributorName || 'Well Wisher',
        phone: c.contributorPhone || '',
        place: c.contributorPlace || (parentOffer?.contributorPlace || ''),
        hasNoPhone: Boolean(c.hasNoPhone || !c.contributorPhone),
        receivingEntity: c.receivingEntity || 'unit',
        receivingEntityName: c.receivingEntityName || '',
        type: 'cash',
        category: c.offerType || 'cash',
        quantity: c.quantity || 1,
        collectorOrVenue: c.collectorName || c.venue || 'Counter Desk',
        status: c.status || 'verified',
        amountPaise: c.amountPaise || 0,
        paidPaise: c.amountPaise || 0,
        remainingPaise: 0,
        linkedOfferId: c.offerId,
        linkedOfferRef,
      });
    });

    // Sort descending by timestamp
    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [allOffers, allCash]);

  // 3. Compute date boundaries based on preset or custom
  const dateBoundaries = useMemo<{ start: Date | null; end: Date | null; label: string }>(() => {
    const now = new Date();

    if (datePreset === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start, end, label: `Today's Report (${start.toLocaleDateString('en-IN')})` };
    }

    if (datePreset === 'week') {
      const day = now.getDay();
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(now.getFullYear(), now.getMonth(), diffToMonday, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), diffToMonday + 6, 23, 59, 59, 999);
      return {
        start,
        end,
        label: `Weekly Report (${start.toLocaleDateString('en-IN')} - ${end.toLocaleDateString('en-IN')})`,
      };
    }

    if (datePreset === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return {
        start,
        end,
        label: `Monthly Report (${start.toLocaleString('en-IN', { month: 'long', year: 'numeric' })})`,
      };
    }

    if (datePreset === 'custom') {
      const start = customStart ? new Date(`${customStart}T00:00:00`) : null;
      const end = customEnd ? new Date(`${customEnd}T23:59:59`) : null;
      const label =
        start && end
          ? `Custom Range (${start.toLocaleDateString('en-IN')} - ${end.toLocaleDateString('en-IN')})`
          : 'Custom Range (All Available Records)';
      return { start, end, label };
    }

    return { start: null, end: null, label: 'All-Time Full Campaign Report' };
  }, [datePreset, customStart, customEnd]);

  // 4. Filter items
  const filteredItems = useMemo(() => {
    return rawReportItems.filter((item) => {
      // Date filter
      if (dateBoundaries.start && item.timestamp < dateBoundaries.start.getTime()) {
        return false;
      }
      if (dateBoundaries.end && item.timestamp > dateBoundaries.end.getTime()) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'all' && item.type !== typeFilter) {
        return false;
      }

      // Receiving Entity / Committee filter
      if (receivingFilter !== 'all') {
        const entity = item.receivingEntity || 'unit';
        if (entity !== receivingFilter) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.contributorName.toLowerCase().includes(q);
        const matchesPhone = item.phone.includes(q);
        const matchesPlace = item.place ? item.place.toLowerCase().includes(q) : false;
        const matchesRef = item.referenceNumber.toLowerCase().includes(q);
        const matchesCollector = item.collectorOrVenue.toLowerCase().includes(q);
        const matchesLinked = item.linkedOfferRef ? item.linkedOfferRef.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesPhone && !matchesPlace && !matchesRef && !matchesCollector && !matchesLinked) {
          return false;
        }
      }

      return true;
    });
  }, [rawReportItems, dateBoundaries, typeFilter, receivingFilter, searchQuery]);

  // 5. Compute Summaries & Breakdowns
  const reportSummary = useMemo<ReportSummary>(() => {
    let totalOfferedPaise = 0;
    let totalCollectedPaise = 0;
    let unitCollectedPaise = 0;
    let districtCollectedPaise = 0;
    let externalCollectedPaise = 0;
    let totalCollectedForOffersPaise = 0;
    let offerCount = 0;
    let collectionCount = 0;

    const categoryMap: { [key: string]: { count: number; amountPaise: number } } = {};
    const volunteerMap: { [key: string]: { venue: string; count: number; amountPaise: number } } = {};

    filteredItems.forEach((item) => {
      if (item.type === 'offer') {
        if (item.status !== 'cancelled') {
          totalOfferedPaise += item.amountPaise;
          offerCount++;

          // Pledges define the category targets
          const catKey = item.category || 'cash';
          if (!categoryMap[catKey]) {
            categoryMap[catKey] = { count: 0, amountPaise: 0 };
          }
          categoryMap[catKey].count += (item.quantity || 1);
          categoryMap[catKey].amountPaise += item.amountPaise;
        }
      } else if (item.type === 'cash') {
        totalCollectedPaise += item.amountPaise;
        collectionCount++;

        const entity = item.receivingEntity || 'unit';
        if (entity === 'unit') {
          unitCollectedPaise += item.amountPaise;
        } else if (entity === 'district') {
          districtCollectedPaise += item.amountPaise;
        } else if (entity === 'external') {
          externalCollectedPaise += item.amountPaise;
        }

        if (item.linkedOfferRef || item.linkedOfferId) {
          totalCollectedForOffersPaise += item.amountPaise;
        } else {
          // Direct counter walk-in donation without prior offer
          const catKey = item.category || 'cash';
          if (!categoryMap[catKey]) {
            categoryMap[catKey] = { count: 0, amountPaise: 0 };
          }
          categoryMap[catKey].count += (item.quantity || 1);
          categoryMap[catKey].amountPaise += item.amountPaise;
        }

        // Volunteer breakdown
        const volKey = item.collectorOrVenue || 'Counter Desk';
        if (!volunteerMap[volKey]) {
          volunteerMap[volKey] = { venue: 'Masjid Desk', count: 0, amountPaise: 0 };
        }
        volunteerMap[volKey].count++;
        volunteerMap[volKey].amountPaise += item.amountPaise;
      }
    });

    // Reconciled Remaining Balance for pledges:
    const remainingBalancePaise = Math.max(0, totalOfferedPaise - totalCollectedForOffersPaise);
    const collectionRate =
      totalOfferedPaise > 0 ? Math.min(100, (totalCollectedPaise / totalOfferedPaise) * 100) : 0;

    // Total campaign commitment without double-counting pledges and payments
    const directCashPaise = totalCollectedPaise - totalCollectedForOffersPaise;
    const grandTotal = totalOfferedPaise + Math.max(0, directCashPaise);

    const categoryBreakdown = Object.entries(categoryMap).map(([category, val]) => ({
      category,
      count: val.count,
      amountPaise: val.amountPaise,
      percent: grandTotal > 0 ? (val.amountPaise / grandTotal) * 100 : 0,
    }));

    const volunteerBreakdown = Object.entries(volunteerMap).map(([volunteer, val]) => ({
      volunteer,
      venue: val.venue,
      receiptsCount: val.count,
      amountPaise: val.amountPaise,
      percent: totalCollectedPaise > 0 ? (val.amountPaise / totalCollectedPaise) * 100 : 0,
    }));

    return {
      totalOfferedPaise,
      totalCollectedPaise,
      unitCollectedPaise,
      districtCollectedPaise,
      externalCollectedPaise,
      remainingBalancePaise,
      collectionRate,
      totalTransactionsCount: filteredItems.length,
      offerCount,
      collectionCount,
      categoryBreakdown,
      volunteerBreakdown,
    };
  }, [filteredItems]);

  // Handlers
  const handleDownloadPdf = () => {
    try {
      setIsGeneratingPdf(true);
      const options: ReportFilterOptions = {
        startDate: dateBoundaries.start,
        endDate: dateBoundaries.end,
        dateRangeLabel: dateBoundaries.label,
        typeFilter,
        receivingFilter,
      };
      generateCampaignPdf(filteredItems, reportSummary, options);
    } catch (e) {
      console.error('Error generating PDF:', e);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleExportCsv = () => {
    const filename = `Salafi_Masjid_Report_${datePreset}.csv`;
    exportReportToCsv(filteredItems, filename);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <FileText size={28} color="var(--brand-800)" />
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: 'var(--brand-900)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Financial & Campaign Reports
            </h1>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Generate official committee audits, monitor cash flow, and download offline backups.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleExportCsv}
            disabled={filteredItems.length === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              background: '#FFFFFF',
              color: 'var(--brand-800)',
              border: '1.5px solid var(--brand-200)',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: filteredItems.length === 0 ? 'not-allowed' : 'pointer',
              opacity: filteredItems.length === 0 ? 0.6 : 1,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <FileSpreadsheet size={18} color="#059669" />
            Export CSV
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf || filteredItems.length === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: 'linear-gradient(135deg, var(--brand-700) 0%, var(--brand-900) 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: isGeneratingPdf || filteredItems.length === 0 ? 'not-allowed' : 'pointer',
              opacity: isGeneratingPdf || filteredItems.length === 0 ? 0.7 : 1,
              boxShadow: '0 4px 14px rgba(6, 78, 59, 0.25)',
              transition: 'transform 0.15s ease',
            }}
          >
            {isGeneratingPdf ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download size={18} />
                Download PDF Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Date Range & Filter Controls Card */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid var(--brand-100)',
          borderRadius: 'var(--radius-xl)',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Top row: Date Presets */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontSize: '0.88rem',
                fontWeight: 700,
                color: 'var(--brand-900)',
                marginRight: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Calendar size={16} color="var(--brand-700)" /> Date Range:
            </span>

            {[
              { id: 'all', label: 'All Time (Full Backup)' },
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'custom', label: 'Custom Range' },
            ].map((preset) => {
              const active = datePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => setDatePreset(preset.id as DatePreset)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: active ? 700 : 500,
                    background: active ? 'var(--brand-800)' : 'var(--bg-secondary)',
                    color: active ? '#FFFFFF' : 'var(--text-secondary)',
                    border: active ? '1px solid var(--brand-900)' : '1px solid #E2E8F0',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Pickers (Shown if 'custom' is selected) */}
          {datePreset === 'custom' && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '14px',
                padding: '12px 16px',
                background: 'var(--brand-50)',
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed var(--brand-300)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brand-900)' }}>
                  From:
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brand-900)' }}>
                  To:
                </label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              {(customStart || customEnd) && (
                <button
                  onClick={() => {
                    setCustomStart('');
                    setCustomEnd('');
                  }}
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--brand-700)',
                    background: 'none',
                    border: 'none',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                  }}
                >
                  Reset Dates
                </button>
              )}
            </div>
          )}

          {/* Bottom row: Search & Type filters */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #F1F5F9',
            }}
          >
            {/* Search */}
            <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
              <Search
                size={16}
                color="#94A3B8"
                style={{ position: 'absolute', left: '12px', top: '10px' }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contributor name, phone, receipt #..."
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.88rem',
                }}
              />
            </div>

            {/* Type Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: 'var(--brand-900)',
                  background: '#FFFFFF',
                }}
              >
                <option value="all">All Records (Offers & Cash)</option>
                <option value="cash">Cash Collections Only</option>
                <option value="offer">Offers Pledged Only</option>
              </select>
            </div>

            {/* Account / Committee Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Account / Committee:</span>
              <select
                value={receivingFilter}
                onChange={(e) => setReceivingFilter(e.target.value as any)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: 'var(--brand-900)',
                  background: '#FFFFFF',
                }}
              >
                <option value="all">All Accounts / Committees</option>
                <option value="unit">കുപ്പം യൂണിറ്റ് (Unit Only)</option>
                <option value="district">ജില്ലാ കമ്മിറ്റി അക്കൗണ്ട് (District Committee)</option>
                <option value="external">മറ്റ് എക്സ്റ്റേണൽ കമ്മിറ്റികൾ (External)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards Grid (Matching the reference model) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Total Offered */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 20px',
            borderTop: '4px solid #10B981',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
            Total Offered (Pledges)
          </div>
          <div
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: '#065F46',
              fontFamily: 'var(--font-display)',
            }}
          >
            {formatINRFromPaise(reportSummary.totalOfferedPaise)}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '4px' }}>
            {reportSummary.offerCount} pledge records in period
          </div>
        </div>

        {/* Total Cash Received */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 20px',
            borderTop: '4px solid #4F46E5',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
            Total Cash Received
          </div>
          <div
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: '#3730A3',
              fontFamily: 'var(--font-display)',
            }}
          >
            {formatINRFromPaise(reportSummary.totalCollectedPaise)}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '4px' }}>
            {reportSummary.collectionCount} verified cash receipts
          </div>
        </div>

        {/* Remaining Balance */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 20px',
            borderTop: '4px solid #E11D48',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
            Outstanding Balance
          </div>
          <div
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: '#9F1239',
              fontFamily: 'var(--font-display)',
            }}
          >
            {formatINRFromPaise(reportSummary.remainingBalancePaise)}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '4px' }}>
            Pledged amount yet to be collected
          </div>
        </div>

        {/* Collection Realization Rate */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 20px',
            borderTop: '4px solid #0284C7',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
            Realization Rate
          </div>
          <div
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: '#0369A1',
              fontFamily: 'var(--font-display)',
            }}
          >
            {reportSummary.collectionRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '4px' }}>
            Cash realized vs total pledges
          </div>
        </div>
      </div>

      {/* Account / Committee Realization Breakdown Banner */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 20px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={20} color="var(--brand-800)" />
          <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--brand-900)' }}>
            Account Breakdown (ഫണ്ട് സ്വീകരിച്ച അക്കൗണ്ടുകൾ):
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>കുപ്പം യൂണിറ്റ്:</span>
            <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#15803D' }}>
              {formatINRFromPaise(reportSummary.unitCollectedPaise || 0)}
            </span>
          </div>

          <div
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: '#1E40AF', fontWeight: 600 }}>ജില്ലാ കമ്മിറ്റി അക്കൗണ്ട്:</span>
            <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1D4ED8' }}>
              {formatINRFromPaise(reportSummary.districtCollectedPaise || 0)}
            </span>
          </div>

          {(reportSummary.externalCollectedPaise || 0) > 0 && (
            <div
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                background: '#FAF5FF',
                border: '1px solid #E9D5FF',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '0.8rem', color: '#6B21A8', fontWeight: 600 }}>മറ്റ് എക്സ്റ്റേണൽ കമ്മിറ്റികൾ:</span>
              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#7E22CE' }}>
                {formatINRFromPaise(reportSummary.externalCollectedPaise || 0)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Breakdowns Row (Category & Volunteer) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          marginBottom: '24px',
        }}
      >
        {/* Category Breakdown Card */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--brand-100)',
            borderRadius: 'var(--radius-xl)',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 700,
              fontSize: '1rem',
              color: 'var(--brand-900)',
              marginBottom: '14px',
            }}
          >
            <Building size={18} color="var(--brand-800)" />
            Offer Breakdown by Category
          </div>

          {reportSummary.categoryBreakdown.length === 0 ? (
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              No category data recorded for this selection.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {reportSummary.categoryBreakdown.map((cat, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', textTransform: 'capitalize' }}>
                      {cat.category}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#64748B', marginLeft: '8px' }}>
                      ({cat.count} items)
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--brand-900)' }}>
                      {formatINRFromPaise(cat.amountPaise)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      {cat.percent.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Volunteer Breakdown Card */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--brand-100)',
            borderRadius: 'var(--radius-xl)',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 700,
              fontSize: '1rem',
              color: 'var(--brand-900)',
              marginBottom: '14px',
            }}
          >
            <Users size={18} color="var(--brand-800)" />
            Cash Collections by Staff / Volunteer
          </div>

          {reportSummary.volunteerBreakdown.length === 0 ? (
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              No volunteer collections recorded for this selection.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {reportSummary.volunteerBreakdown.map((vol, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{vol.volunteer}</span>
                    <span style={{ fontSize: '0.78rem', color: '#64748B', marginLeft: '8px' }}>
                      ({vol.receiptsCount} receipts)
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#3730A3' }}>
                      {formatINRFromPaise(vol.amountPaise)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      {vol.percent.toFixed(1)}% of cash
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Records Table */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid var(--brand-100)',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-secondary)',
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--brand-900)', fontSize: '0.95rem' }}>
            Detailed Transactions ({filteredItems.length} records found)
          </div>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Showing live Firestore sync
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--brand-800)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontWeight: 600 }}>Loading transactions from database...</div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <AlertCircle size={32} style={{ margin: '0 auto 8px', color: '#94A3B8' }} />
            <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-secondary)' }}>
              No transactions match your criteria
            </div>
            <p style={{ fontSize: '0.85rem', margin: '4px 0 0' }}>
              Try adjusting the date range preset or clearing your search term.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Date & Time</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Ref / Receipt #</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Contributor</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Phone</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Collector / Desk</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.slice(0, 50).map((item) => {
                  const isCash = item.type === 'cash';
                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '12px 16px', color: '#64748B', fontSize: '0.82rem' }}>
                        {item.date}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, fontFamily: 'monospace' }}>
                        {item.referenceNumber}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--brand-900)' }}>
                        {item.contributorName}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748B' }}>
                        {item.hasNoPhone || !item.phone ? (
                          <span style={{ fontStyle: 'italic', color: '#94A3B8', fontSize: '0.8rem' }}>ലഭ്യമല്ല</span>
                        ) : (
                          item.phone
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              width: 'fit-content',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: isCash
                                ? (item.linkedOfferRef ? '#EEF2FF' : '#F1F5F9')
                                : item.status === 'verified'
                                ? '#ECFDF5'
                                : item.status === 'partial'
                                ? '#EFF6FF'
                                : '#FEF3C7',
                              color: isCash
                                ? (item.linkedOfferRef ? '#4338CA' : '#334155')
                                : item.status === 'verified'
                                ? '#047857'
                                : item.status === 'partial'
                                ? '#1D4ED8'
                                : '#B45309',
                            }}
                          >
                            {isCash ? (
                              item.linkedOfferRef ? `Payment (Offer #${item.linkedOfferRef})` : 'Cash Received'
                            ) : item.status === 'verified' ? (
                              'Offer (Fully Paid)'
                            ) : item.status === 'partial' ? (
                              'Offer (Partially Paid)'
                            ) : (
                              'Offer Pledged'
                            )}
                          </span>

                          {/* Account indicator if District or External */}
                          {item.receivingEntity === 'district' && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                width: 'fit-content',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                background: '#EFF6FF',
                                color: '#1D4ED8',
                                border: '1px solid #BFDBFE',
                              }}
                            >
                              🏛️ ജില്ലാ കമ്മിറ്റി
                            </span>
                          )}
                          {item.receivingEntity === 'external' && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                width: 'fit-content',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                background: '#FAF5FF',
                                color: '#7E22CE',
                                border: '1px solid #E9D5FF',
                              }}
                            >
                              🌐 {item.receivingEntityName || 'External'}
                            </span>
                          )}

                          {!isCash && (item.paidPaise ?? 0) > 0 && (
                            <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                              Paid: {formatINRFromPaise(item.paidPaise || 0)}
                              {(item.remainingPaise ?? 0) > 0 && ` • Due: ${formatINRFromPaise(item.remainingPaise || 0)}`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        {item.collectorOrVenue}
                      </td>
                      <td
                        style={{
                          padding: '12px 16px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: isCash ? '#3730A3' : '#065F46',
                        }}
                      >
                        {formatINRFromPaise(item.amountPaise)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredItems.length > 50 && (
              <div
                style={{
                  padding: '12px 20px',
                  background: 'var(--bg-secondary)',
                  textAlign: 'center',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  borderTop: '1px solid #E2E8F0',
                }}
              >
                Showing top 50 records in preview. Click <strong>"Download PDF Report"</strong> or{' '}
                <strong>"Export CSV"</strong> to get all {filteredItems.length} records.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
