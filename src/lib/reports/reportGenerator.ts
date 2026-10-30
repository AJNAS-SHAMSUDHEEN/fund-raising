import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReportItem {
  id: string;
  referenceNumber: string; // REC-xxxx or OFF-xxxx
  date: string;            // Formatted date string
  timestamp: number;       // For filtering
  contributorName: string;
  phone: string;
  place?: string;
  type: 'offer' | 'cash';
  category: string;        // 'cash', 'sqft', 'musalla', etc.
  quantity?: number;
  collectorOrVenue: string;
  status: string;
  amountPaise: number;
  paidPaise?: number;
  remainingPaise?: number;
  linkedOfferId?: string;
  linkedOfferRef?: string;
}

export interface ReportFilterOptions {
  startDate?: Date | null;
  endDate?: Date | null;
  dateRangeLabel: string;
  typeFilter?: 'all' | 'cash' | 'offer';
  collectorFilter?: string;
}

export interface ReportSummary {
  totalOfferedPaise: number;
  totalCollectedPaise: number;
  remainingBalancePaise: number;
  collectionRate: number; // percentage e.g. 68.5
  totalTransactionsCount: number;
  offerCount: number;
  collectionCount: number;
  categoryBreakdown: {
    category: string;
    count: number;
    amountPaise: number;
    percent: number;
  }[];
  volunteerBreakdown: {
    volunteer: string;
    venue: string;
    receiptsCount: number;
    amountPaise: number;
    percent: number;
  }[];
}

// Format paise to standard INR string: Rs. 1,50,000.00
export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return `Rs. ${rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function generateCampaignPdf(
  items: ReportItem[],
  summary: ReportSummary,
  options: ReportFilterOptions
) {
  // Initialize jsPDF document (A4 format, portrait, millimeters)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = 16;

  // 1. Organization & Title Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('FINANCIAL REPORT', margin, currentY);

  // Right-aligned Organization Brand
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('Salafi Masjid Kuppam', pageWidth - margin, currentY - 2, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const nowStr = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  doc.text(`Generated: ${nowStr}`, pageWidth - margin, currentY + 3, { align: 'right' });

  currentY += 7;

  // Subtitle / Date Range Badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(217, 119, 6); // amber-600
  doc.text(options.dateRangeLabel, margin, currentY);

  currentY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const dateSub = options.startDate && options.endDate
    ? `${options.startDate.toLocaleDateString('en-IN')} - ${options.endDate.toLocaleDateString('en-IN')}`
    : 'Full Historical Audit Archive';
  doc.text(dateSub, margin, currentY);

  currentY += 6;

  // Horizontal divider line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 6;

  // 2. Executive Summary KPI Grid (4 Columns)
  const boxWidth = (pageWidth - margin * 2 - 9) / 4;
  const boxHeight = 18;

  const kpis = [
    {
      title: 'Total Offered',
      value: formatINR(summary.totalOfferedPaise),
      color: [16, 185, 129], // emerald
      bgColor: [240, 253, 244],
    },
    {
      title: 'Total Received (Cash)',
      value: formatINR(summary.totalCollectedPaise),
      color: [79, 70, 229], // indigo
      bgColor: [238, 242, 255],
    },
    {
      title: 'Outstanding Balance',
      value: formatINR(summary.remainingBalancePaise),
      color: [225, 29, 72], // rose
      bgColor: [255, 241, 242],
    },
    {
      title: 'Realization Rate',
      value: `${summary.collectionRate.toFixed(1)}%`,
      color: [2, 132, 199], // sky
      bgColor: [240, 249, 255],
    },
  ];

  kpis.forEach((kpi, index) => {
    const x = margin + index * (boxWidth + 3);
    
    // Background fill
    doc.setFillColor(kpi.bgColor[0], kpi.bgColor[1], kpi.bgColor[2]);
    doc.roundedRect(x, currentY, boxWidth, boxHeight, 2, 2, 'F');
    
    // Border
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, currentY, boxWidth, boxHeight, 2, 2, 'S');

    // Title
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.title, x + boxWidth / 2, currentY + 6, { align: 'center' });

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, x + boxWidth / 2, currentY + 13, { align: 'center' });
  });

  currentY += boxHeight + 8;

  // 3. Category Breakdown Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('OFFER & CONTRIBUTION BREAKDOWN BY CATEGORY', margin, currentY);
  currentY += 3;

  const categoryRows = summary.categoryBreakdown.map((c) => [
    c.category.toUpperCase(),
    `${c.count} contributions`,
    formatINR(c.amountPaise),
    `${c.percent.toFixed(1)}%`,
  ]);

  if (categoryRows.length === 0) {
    categoryRows.push(['No categories recorded in this range', '-', 'Rs. 0.00', '0.0%']);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['Category / Purpose', 'Pledges Count', 'Total Amount', '% Share']],
    body: categoryRows,
    theme: 'plain',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2.5,
    },
    bodyStyles: {
      textColor: [30, 41, 59],
      fontSize: 8,
      cellPadding: 2.2,
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 40 },
      2: { cellWidth: 45, halign: 'right' },
      3: { cellWidth: 25, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  // Get Y position after category table
  currentY = (doc as any).lastAutoTable.finalY + 6;

  // 4. Volunteer Collection Breakdown
  if (summary.volunteerBreakdown.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('CASH COLLECTIONS BY VOLUNTEER / DESK', margin, currentY);
    currentY += 3;

    const volunteerRows = summary.volunteerBreakdown.map((v) => [
      v.volunteer,
      v.venue || 'General',
      `${v.receiptsCount} receipts`,
      formatINR(v.amountPaise),
      `${v.percent.toFixed(1)}%`,
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Staff / Volunteer Name', 'Venue / Collection Desk', 'Receipts', 'Total Collected', '% of Cash']],
      body: volunteerRows,
      theme: 'plain',
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [51, 65, 85],
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 2.5,
      },
      bodyStyles: {
        textColor: [30, 41, 59],
        fontSize: 8,
        cellPadding: 2.2,
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 45 },
        2: { cellWidth: 25 },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' },
      },
      margin: { left: margin, right: margin },
    });

    currentY = (doc as any).lastAutoTable.finalY + 7;
  }

  // 5. Detailed Transaction Log Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`TRANSACTION DETAILS (${items.length} RECORDS)`, margin, currentY);
  currentY += 3;

  const transactionRows = items.map((item) => {
    const isCash = item.type === 'cash';
    let typeLabel = isCash ? 'Cash Received' : 'Offer Pledged';
    if (isCash && item.linkedOfferRef) {
      typeLabel = `Payment (Offer #${item.linkedOfferRef})`;
    } else if (!isCash) {
      if (item.status === 'verified') {
        typeLabel = 'Offer (Fully Paid)';
      } else if (item.status === 'partial') {
        typeLabel = 'Offer (Partially Paid)';
      }
    }
    return [
      item.date,
      item.referenceNumber,
      item.contributorName,
      item.phone || '-',
      typeLabel,
      item.collectorOrVenue || 'Direct',
      formatINR(item.amountPaise),
    ];
  });

  if (transactionRows.length === 0) {
    transactionRows.push(['-', '-', 'No transactions found for this period', '-', '-', '-', 'Rs. 0.00']);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['Date / Time', 'Ref / Receipt #', 'Contributor Name', 'Phone', 'Type', 'Collector / Desk', 'Amount']],
    body: transactionRows,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59], // dark navy header
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 2.5,
    },
    bodyStyles: {
      textColor: [30, 41, 59],
      fontSize: 7.5,
      cellPadding: 2.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 24 },
      2: { cellWidth: 38 },
      3: { cellWidth: 24 },
      4: { cellWidth: 22 },
      5: { cellWidth: 24 },
      6: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin, bottom: 16 },
    didDrawPage: (data) => {
      // Confidential Footer & Page numbers on every page
      const pageNumber = doc.getNumberOfPages();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(
        'Confidential - Generated for Salafi Masjid Kuppam Committee',
        margin,
        pageHeight - 8
      );
      doc.text(
        `Page ${data.pageNumber}`,
        pageWidth - margin,
        pageHeight - 8,
        { align: 'right' }
      );
    },
  });

  // Calculate and update total pages in footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    // Overwrite the page string with "Page i of totalPages"
    doc.setFillColor(255, 255, 255);
    doc.rect(pageWidth - margin - 25, pageHeight - 11, 25, 6, 'F');
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, {
      align: 'right',
    });
  }

  // Generate file name based on filter dates
  const fromClean = options.startDate
    ? options.startDate.toISOString().split('T')[0]
    : 'ALL';
  const toClean = options.endDate
    ? options.endDate.toISOString().split('T')[0]
    : 'PRESENT';
  const fileName = `Salafi_Masjid_Report_${fromClean}_to_${toClean}.pdf`;

  // Save/Download to client machine
  doc.save(fileName);
  return fileName;
}

// Optional CSV Export utility for Excel / Google Sheets
export function exportReportToCsv(items: ReportItem[], fileName = 'Campaign_Transactions.csv') {
  const headers = [
    'Date',
    'Reference Number',
    'Contributor Name',
    'Phone',
    'Place',
    'Type',
    'Category',
    'Collector / Desk',
    'Status',
    'Amount (Rs.)',
    'Paid (Rs.)',
    'Remaining (Rs.)',
    'Linked Offer Ref',
  ];

  const rows = items.map((item) => [
    `"${item.date}"`,
    `"${item.referenceNumber}"`,
    `"${item.contributorName.replace(/"/g, '""')}"`,
    `"${item.phone}"`,
    `"${item.place || ''}"`,
    `"${item.type}"`,
    `"${item.category}"`,
    `"${item.collectorOrVenue.replace(/"/g, '""')}"`,
    `"${item.status}"`,
    (item.amountPaise / 100).toFixed(2),
    item.paidPaise !== undefined ? (item.paidPaise / 100).toFixed(2) : (item.type === 'cash' ? (item.amountPaise / 100).toFixed(2) : '0.00'),
    item.remainingPaise !== undefined ? (item.remainingPaise / 100).toFixed(2) : '0.00',
    `"${item.linkedOfferRef || ''}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
