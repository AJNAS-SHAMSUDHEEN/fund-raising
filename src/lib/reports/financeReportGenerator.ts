import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { KuppamHandler, FinanceRecord } from '@/lib/types/finance';

interface FinanceReportData {
  totalCashPaise: number;
  districtCollectedPaise: number;
  kuppamCollectedPaise: number;
  districtExpensesPaise: number;
  districtLandownerPaise: number;
  districtBalancePaise: number;
  totalHandedOverToHandlersPaise: number;
  totalBalanceHeldByHandlersPaise: number;
  kuppamTotalAvailablePaise: number;
  totalExpensesPaise: number;
  totalLandownerPaidPaise: number;
  overallNetBalancePaise: number;
  handlers: KuppamHandler[];
  handlerStats: {
    [id: string]: {
      receivedPaise: number;
      expensesPaise: number;
      landownerPaise: number;
      balancePaise: number;
    };
  };
  records: FinanceRecord[];
  generatedByName?: string;
}

function formatINRText(paise: number): string {
  const rupees = Math.round(paise / 100);
  return 'Rs. ' + rupees.toLocaleString('en-IN');
}

export function generateFinanceReportPDF(data: FinanceReportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = 16;

  // Header Banner
  doc.setFillColor(11, 59, 36); // #0B3B24 Deep Forest Green
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('FINANCE & FUND AUDIT REPORT', margin, 12);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text('Salafi Masjid Land Acquisition Project — Wisdom Islamic Organisation, Kuppam Unit', margin, 18);

  // Generated metadata
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  doc.setFontSize(7.5);
  doc.setTextColor(190, 242, 100);
  doc.text(
    `Generated: ${dateStr} at ${timeStr} | Officer: ${data.generatedByName || 'Super Admin'}`,
    margin,
    24
  );

  currentY = 34;

  // 1. EXECUTIVE SUMMARY SECTION HEADER
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1. EXECUTIVE FINANCIAL SUMMARY (COLLECTIONS & BALANCES)', margin, currentY);
  currentY += 4;

  // Top 6 KPI summary grid (2 rows of 3 columns)
  const colWidth = (pageWidth - margin * 2 - 8) / 3;
  const rowHeight = 16;

  const topCards = [
    {
      title: 'TOTAL CASH COLLECTED',
      value: formatINRText(data.totalCashPaise),
      sub: 'Auto Live from Receipts',
      textColor: [5, 150, 105], // emerald
      bgColor: [240, 253, 244],
    },
    {
      title: 'DISTRICT COMMITTEE FUND',
      value: formatINRText(data.districtBalancePaise),
      sub: `Recv: ${formatINRText(data.districtCollectedPaise)}`,
      textColor: [37, 99, 235], // blue
      bgColor: [239, 246, 255],
    },
    {
      title: 'KUPPAM COMMITTEE FUND',
      value: formatINRText(data.kuppamTotalAvailablePaise),
      sub: `Recv: ${formatINRText(data.kuppamCollectedPaise)}`,
      textColor: [13, 148, 136], // teal
      bgColor: [240, 253, 250],
    },
    {
      title: 'HELD BY HANDLERS / PEOPLE',
      value: formatINRText(data.totalBalanceHeldByHandlersPaise),
      sub: `${data.handlers.length} Handlers / Accounts`,
      textColor: [79, 70, 229], // indigo
      bgColor: [238, 242, 255],
    },
    {
      title: 'PAID TO LANDOWNER',
      value: formatINRText(data.totalLandownerPaidPaise),
      sub: 'Land Acquisition Payments',
      textColor: [225, 29, 72], // rose
      bgColor: [255, 241, 242],
    },
    {
      title: 'TOTAL PROJECT EXPENSES',
      value: formatINRText(data.totalExpensesPaise),
      sub: 'Printing, Travel, Documentation',
      textColor: [217, 119, 6], // amber
      bgColor: [254, 243, 199],
    },
  ];

  // Draw 2 rows of 3 cards
  topCards.forEach((c, idx) => {
    const row = Math.floor(idx / 3);
    const col = idx % 3;
    const x = margin + col * (colWidth + 4);
    const y = currentY + row * (rowHeight + 4);

    // Background
    doc.setFillColor(c.bgColor[0], c.bgColor[1], c.bgColor[2]);
    doc.roundedRect(x, y, colWidth, rowHeight, 2, 2, 'F');

    // Border
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, colWidth, rowHeight, 2, 2, 'S');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(c.title, x + 3.5, y + 4.5);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(c.textColor[0], c.textColor[1], c.textColor[2]);
    doc.text(c.value, x + 3.5, y + 10.5);

    // Subtext
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(c.sub, x + 3.5, y + 14);
  });

  currentY += rowHeight * 2 + 10;

  // 2. KUPPAM COMMITTEE HANDLERS & CUSTODY BREAKDOWN TABLE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('2. KUPPAM COMMITTEE HANDLERS & MONEY CUSTODY BREAKDOWN', margin, currentY);
  currentY += 3;

  const handlerTableRows = data.handlers.map((h) => {
    const stat = data.handlerStats[h.id] || {
      receivedPaise: 0,
      expensesPaise: 0,
      landownerPaise: 0,
      balancePaise: 0,
    };
    return [
      h.name,
      h.role || 'Committee Member',
      h.phone || '—',
      formatINRText(stat.receivedPaise),
      formatINRText(stat.expensesPaise),
      formatINRText(stat.landownerPaise),
      formatINRText(stat.balancePaise),
    ];
  });

  if (handlerTableRows.length === 0) {
    handlerTableRows.push(['No individual handlers recorded yet', '—', '—', 'Rs. 0', 'Rs. 0', 'Rs. 0', 'Rs. 0']);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['HANDLER / ACCOUNT', 'ROLE', 'PHONE', 'HANDED OVER', 'SPENT', 'LANDOWNER', 'IN-HAND BALANCE']],
    body: handlerTableRows,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      font: 'helvetica',
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [15, 118, 110], // Teal header
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 38, fontStyle: 'bold' },
      1: { cellWidth: 28 },
      2: { cellWidth: 22 },
      3: { cellWidth: 24, halign: 'right' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: [22, 101, 52] },
    },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Check if we need a page break before the transactions table
  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = 16;
  }

  // 3. RECENT AUDIT LEDGER TABLE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('3. DETAILED FINANCIAL TRANSACTIONS & EXPENSES LEDGER', margin, currentY);
  currentY += 3;

  const transactionRows = data.records.map((r) => {
    let typeDisplay = 'Expense';
    if (r.type === 'handover') typeDisplay = 'Handover';
    else if (r.type === 'landowner_payment') typeDisplay = 'Land Payment';

    const statusNote = r.status === 'cancelled' ? ' (CANCELLED)' : '';

    return [
      r.date || '—',
      r.recordNumber || '—',
      `${typeDisplay}${statusNote}`,
      r.title || '—',
      r.sourceHandlerName || '—',
      r.targetHandlerName || r.recipient || '—',
      formatINRText(r.amountPaise),
    ];
  });

  if (transactionRows.length === 0) {
    transactionRows.push(['—', '—', '—', 'No transactions recorded', '—', '—', 'Rs. 0']);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['DATE', 'REF NO', 'TYPE', 'DESCRIPTION / PURPOSE', 'SOURCE ACCOUNT', 'RECIPIENT / TO', 'AMOUNT']],
    body: transactionRows,
    theme: 'striped',
    styles: {
      fontSize: 7.2,
      cellPadding: 2,
      font: 'helvetica',
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800 header
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 22, fontStyle: 'italic', textColor: [100, 116, 139] },
      2: { cellWidth: 22 },
      3: { cellWidth: 42 },
      4: { cellWidth: 28 },
      5: { cellWidth: 26 },
      6: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin },
  });

  // Footer on all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);

    const footerText = 'Confidential — For Internal Masjid Finance Committee & Audit Review Only';
    doc.text(footerText, margin, pageHeight - 8);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);
  }

  // Trigger browser download
  const filename = `Finance_Management_Report_${now.toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

