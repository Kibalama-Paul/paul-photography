import { BookingSubmission } from '../types';

// ──────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────
export interface ReceiptLineItem {
  description: string;
  amount: string;
}

export interface ReceiptData {
  receiptNo?: string;
  clientName: string;
  clientPhone?: string;
  shootType: string;
  location?: string;
  shootDate?: string;
  amountPaid: string;
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
  issuedAt?: string;
  extraItems?: ReceiptLineItem[];
}

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────
export const bookingToReceiptData = (b: BookingSubmission): ReceiptData => ({
  receiptNo: b.id,
  clientName: b.name,
  clientPhone: b.phone,
  shootType: b.shootType,
  location: b.location,
  shootDate: b.datetime?.replace('T', ' at '),
  amountPaid: b.amountPaid || '0',
  paymentMethod: 'Airtel Money',
  transactionId: b.transactionId,
  notes: b.notes,
  issuedAt: b.adminApprovedAt || b.createdAt,
});

// ──────────────────────────────────────────────────────────────────
// HTML Receipt Template
// ──────────────────────────────────────────────────────────────────
export const generateReceiptHTML = (data: ReceiptData): string => {
  const now = data.issuedAt ? new Date(data.issuedAt) : new Date();
  const dateStr = now.toLocaleDateString('en-UG', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-UG', {
    hour: '2-digit', minute: '2-digit',
  });
  const receiptNo = data.receiptNo || `RCP-${Math.floor(1000 + Math.random() * 9000)}`;

  // All extra line items
  const extraRows = (data.extraItems || [])
    .map(item => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#374151">${item.description}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;font-weight:700;color:#111;text-align:right">UGX ${item.amount}</td>
      </tr>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Receipt ${receiptNo} — Paul Photography</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f2f5;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .wrap{max-width:680px;margin:18px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,.12);page-break-inside:avoid;break-inside:avoid}
  /* header */
  .hdr{background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);color:#fff;padding:24px 32px 18px;position:relative;overflow:hidden}
  .hdr::before{content:'';position:absolute;top:-50px;right:-50px;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,.04)}
  .hdr::after{content:'';position:absolute;bottom:-25px;left:-25px;width:130px;height:130px;border-radius:50%;background:rgba(255,255,255,.03)}
  .brand{display:flex;align-items:center;gap:14px;margin-bottom:16px}
  .brand-logo-wrap{width:48px;height:48px;border-radius:12px;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;padding:4px;flex-shrink:0;box-shadow:0 0 15px rgba(139,92,246,.3)}
  .brand-logo{width:100%;height:100%;object-fit:contain}
  .brand-name{font-size:20px;font-weight:800;letter-spacing:-.4px}
  .brand-tag{font-size:9.5px;color:rgba(255,255,255,.55);letter-spacing:2px;text-transform:uppercase;margin-top:2px}
  .hdr-bottom{display:flex;justify-content:space-between;align-items:flex-end}
  .receipt-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:20px;padding:3px 12px;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.9);margin-bottom:6px}
  .big-title{font-size:26px;font-weight:900;letter-spacing:-.8px}
  .meta-right{text-align:right}
  .rno{font-family:'Courier New',monospace;font-size:16px;font-weight:700;color:#c4b5fd}
  .rdate{font-size:10.5px;color:rgba(255,255,255,.6);margin-top:3px}
  /* status bar */
  .sbar{background:#10b981;padding:7px 32px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:10px;font-weight:700;color:#fff;letter-spacing:1.5px;text-transform:uppercase}
  /* body */
  .body{padding:22px 32px}
  /* parties */
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:18px;padding-bottom:16px;border-bottom:1.5px dashed #e5e7eb}
  .plabel{font-size:8.5px;font-weight:700;color:#9ca3af;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px}
  .pname{font-size:15px;font-weight:800;color:#111;margin-bottom:3px}
  .pdetail{font-size:11.5px;color:#6b7280;line-height:1.55}
  /* table */
  .tbl{width:100%;border-collapse:collapse;margin-bottom:2px}
  .tbl thead th{padding:7px 12px;background:#f9fafb;font-size:8.5px;font-weight:700;color:#9ca3af;letter-spacing:1.5px;text-transform:uppercase;text-align:left}
  .tbl thead th:last-child{text-align:right}
  .tbl tbody tr:last-child td{border-bottom:none}
  /* totals */
  .totals{background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:1.5px solid #bbf7d0;border-radius:10px;padding:12px 16px;margin-top:8px}
  .tot-row{display:flex;justify-content:space-between;font-size:11.5px;color:#6b7280;margin-bottom:5px}
  .tot-final{display:flex;justify-content:space-between;font-size:17px;font-weight:900;color:#065f46;padding-top:8px;border-top:1.5px solid #6ee7b7;margin-top:3px}
  /* payment */
  .pay-card{margin-top:12px;padding:11px 15px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;display:flex;justify-content:space-between;align-items:center;gap:10px}
  .pay-label{font-size:8.5px;font-weight:700;color:#ef4444;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px}
  .pay-val{font-size:11.5px;font-weight:600;color:#991b1b}
  .txn{font-family:'Courier New',monospace;font-size:11.5px;font-weight:700;color:#059669;background:#d1fae5;border:1px solid #a7f3d0;padding:5px 10px;border-radius:7px;white-space:nowrap}
  /* notes */
  .notes{margin-top:10px;padding:10px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px}
  .notes-lbl{font-size:8.5px;font-weight:700;color:#92400e;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px}
  .notes-txt{font-size:11.5px;color:#78350f;line-height:1.5}
  /* signatures */
  .sigs{display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-top:22px;padding-top:16px;border-top:1.5px dashed #e5e7eb}
  .sig-box{text-align:center}
  .sig-line{border-top:1.5px solid #d1d5db;padding-top:22px;margin-bottom:4px}
  .sig-lbl{font-size:9px;color:#9ca3af;font-weight:600}
  .sig-name{font-size:11.5px;color:#374151;font-weight:700;margin-top:2px}
  /* footer */
  .ftr{background:#f9fafb;border-top:1px solid #f0f0f0;padding:12px 32px;display:flex;justify-content:space-between;align-items:center}
  .ftr-brand{font-size:11.5px;font-weight:700;color:#374151;display:flex;align-items:center;gap:6px}
  .ftr-contact{font-size:10px;color:#9ca3af;margin-top:1px}
  .ftr-note{font-size:10px;color:#9ca3af;text-align:right;line-height:1.5}
  /* watermark */
  .wm{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:68px;font-weight:900;color:rgba(0,0,0,.025);letter-spacing:8px;pointer-events:none;white-space:nowrap;z-index:0}
  @page{size:A4 portrait;margin:6mm 8mm}
  @media print{
    html,body{background:#fff!important;color:#111!important;margin:0!important;padding:0!important;height:auto!important}
    .wrap{box-shadow:none!important;margin:0 auto!important;border-radius:0!important;max-width:100%!important;page-break-inside:avoid!important;break-inside:avoid!important;page-break-after:avoid!important;page-break-before:avoid!important}
    .no-print{display:none!important}
    .wm{font-size:60px;opacity:.025}
  }
</style>
</head>
<body>
<div class="wm">PAUL PHOTOGRAPHY</div>
<div class="wrap">

  <!-- Header -->
  <div class="hdr">
    <div class="brand">
      <div class="brand-logo-wrap">
        <img src="https://res.cloudinary.com/dirfcqs1f/image/upload/v1748599973/Group_1_tppp56.png" alt="Paul Photography Logo" class="brand-logo" />
      </div>
      <div>
        <div class="brand-name">Paul Photography</div>
        <div class="brand-tag">Professional Photography &amp; Media Services</div>
      </div>
    </div>
    <div class="hdr-bottom">
      <div>
        <div class="receipt-badge">✦ Official Receipt</div>
        <div class="big-title">Receipt</div>
      </div>
      <div class="meta-right">
        <div class="rno">${receiptNo}</div>
        <div class="rdate">Issued: ${dateStr} at ${timeStr}</div>
      </div>
    </div>
  </div>

  <!-- Status bar -->
  <div class="sbar">✓ &nbsp; Payment Received &amp; Booking Confirmed</div>

  <!-- Body -->
  <div class="body">

    <!-- Parties -->
    <div class="parties">
      <div>
        <div class="plabel">Bill To (Client)</div>
        <div class="pname">${data.clientName}</div>
        <div class="pdetail">
          ${data.clientPhone ? `📞 ${data.clientPhone}` : ''}
        </div>
      </div>
      <div>
        <div class="plabel">Issued By</div>
        <div class="pname">Kibalama Paul</div>
        <div class="pdetail">
          CEO, Paul Photography<br>
          📞 +256 757 460 297<br>
          📍 Kampala, Uganda
        </div>
      </div>
    </div>

    <!-- Service Table -->
    <table class="tbl">
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6">
            <div style="font-size:13px;font-weight:600;color:#111">${data.shootType} — Photography / Media Service</div>
            ${data.shootDate ? `<div style="font-size:10.5px;color:#9ca3af;margin-top:2px">📅 Scheduled: ${data.shootDate}</div>` : ''}
            ${data.location ? `<div style="font-size:10.5px;color:#9ca3af;margin-top:2px">📍 Location: ${data.location}</div>` : ''}
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13.5px;font-weight:700;color:#111;text-align:right;white-space:nowrap">UGX ${data.amountPaid}</td>
        </tr>
        ${extraRows}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
      <div class="tot-row"><span>Subtotal</span><span>UGX ${data.amountPaid}</span></div>
      <div class="tot-final"><span>Total Paid</span><span>UGX ${data.amountPaid}</span></div>
    </div>

    <!-- Payment method -->
    <div class="pay-card">
      <div>
        <div class="pay-label">${data.paymentMethod || 'Airtel Money'}</div>
        <div class="pay-val">Paid to: Kawulukusi Godfrey (+256 757 460 297)</div>
      </div>
      ${data.transactionId ? `<div class="txn">${data.transactionId}</div>` : ''}
    </div>

    <!-- Notes -->
    ${data.notes ? `
    <div class="notes">
      <div class="notes-lbl">Notes</div>
      <div class="notes-txt">${data.notes}</div>
    </div>` : ''}

    <!-- Signatures -->
    <div class="sigs">
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-lbl">Client Signature</div>
        <div class="sig-name">${data.clientName}</div>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-lbl">Authorized By</div>
        <div class="sig-name">Kibalama Paul — CEO</div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="ftr">
    <div>
      <div class="ftr-brand">
        <img src="https://res.cloudinary.com/dirfcqs1f/image/upload/v1748599973/Group_1_tppp56.png" alt="Logo" style="width:16px;height:16px;object-fit:contain;border-radius:4px" />
        <span>Paul Photography</span>
      </div>
      <div class="ftr-contact">+256 757 460 297 &nbsp;•&nbsp; Kampala, Uganda</div>
    </div>
    <div class="ftr-note">
      Official payment receipt.<br>
      Thank you for choosing Paul Photography! 🙏
    </div>
  </div>
</div>

<!-- Print toolbar (hidden in print) -->
<div class="no-print" style="max-width:680px;margin:14px auto;display:flex;gap:10px;padding:0 4px">
  <button onclick="window.print()"
    style="flex:1;padding:12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">
    🖨️ &nbsp; Print / Save as PDF
  </button>
  <button onclick="window.close()"
    style="padding:12px 18px;background:#f3f4f6;color:#374151;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer">
    Close
  </button>
</div>
</body>
</html>`;
};

// ──────────────────────────────────────────────────────────────────
// Actions
// ──────────────────────────────────────────────────────────────────

/** Opens receipt in a new tab via Blob URL — reliably works across all browsers */
export const printReceipt = (data: ReceiptData): void => {
  const html = generateReceiptHTML(data);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    alert('Please allow pop-ups for this site to open the receipt.');
    URL.revokeObjectURL(url);
    return;
  }
  setTimeout(() => URL.revokeObjectURL(url), 30000);
};

/** Downloads receipt as a self-contained HTML file */
export const downloadReceiptHTML = (data: ReceiptData): void => {
  const html = generateReceiptHTML(data);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Receipt-${data.receiptNo || 'PaulPhotography'}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
