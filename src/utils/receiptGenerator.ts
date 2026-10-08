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
        <td style="padding:12px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151">${item.description}</td>
        <td style="padding:12px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:700;color:#111;text-align:right">UGX ${item.amount}</td>
      </tr>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Receipt ${receiptNo} — Paul Photography</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f2f5;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .wrap{max-width:700px;margin:36px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.15)}
  /* header */
  .hdr{background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);color:#fff;padding:44px 44px 36px;position:relative;overflow:hidden}
  .hdr::before{content:'';position:absolute;top:-60px;right:-60px;width:260px;height:260px;border-radius:50%;background:rgba(255,255,255,.04)}
  .hdr::after{content:'';position:absolute;bottom:-30px;left:-30px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,.03)}
  .brand{display:flex;align-items:center;gap:16px;margin-bottom:28px}
  .brand-icon{width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
  .brand-name{font-size:21px;font-weight:800;letter-spacing:-.4px}
  .brand-tag{font-size:10px;color:rgba(255,255,255,.5);letter-spacing:2.5px;text-transform:uppercase;margin-top:3px}
  .hdr-bottom{display:flex;justify-content:space-between;align-items:flex-end}
  .receipt-badge{display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.18);border-radius:30px;padding:5px 15px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.85);margin-bottom:10px}
  .big-title{font-size:36px;font-weight:900;letter-spacing:-1.5px}
  .meta-right{text-align:right}
  .rno{font-family:'Courier New',monospace;font-size:20px;font-weight:700;color:#a78bfa}
  .rdate{font-size:11px;color:rgba(255,255,255,.5);margin-top:5px}
  /* status bar */
  .sbar{background:#10b981;padding:10px 44px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:11px;font-weight:700;color:#fff;letter-spacing:1.5px;text-transform:uppercase}
  /* body */
  .body{padding:40px 44px}
  /* parties */
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:36px;padding-bottom:32px;border-bottom:2px dashed #e5e7eb}
  .plabel{font-size:9px;font-weight:700;color:#9ca3af;letter-spacing:2px;text-transform:uppercase;margin-bottom:9px}
  .pname{font-size:18px;font-weight:800;color:#111;margin-bottom:4px}
  .pdetail{font-size:12.5px;color:#6b7280;line-height:1.7}
  /* table */
  .tbl{width:100%;border-collapse:collapse;margin-bottom:4px}
  .tbl thead th{padding:9px 14px;background:#f9fafb;font-size:9px;font-weight:700;color:#9ca3af;letter-spacing:1.5px;text-transform:uppercase;text-align:left}
  .tbl thead th:last-child{text-align:right}
  .tbl tbody tr:last-child td{border-bottom:none}
  /* totals */
  .totals{background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:1.5px solid #bbf7d0;border-radius:14px;padding:20px 22px;margin-top:14px}
  .tot-row{display:flex;justify-content:space-between;font-size:13px;color:#6b7280;margin-bottom:8px}
  .tot-final{display:flex;justify-content:space-between;font-size:22px;font-weight:900;color:#065f46;padding-top:12px;border-top:2px solid #6ee7b7;margin-top:4px}
  /* payment */
  .pay-card{margin-top:22px;padding:18px 20px;background:#fef2f2;border:1.5px solid #fecaca;border-radius:12px;display:flex;justify-content:space-between;align-items:center;gap:12px}
  .pay-label{font-size:9px;font-weight:700;color:#ef4444;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px}
  .pay-val{font-size:13px;font-weight:600;color:#991b1b}
  .txn{font-family:'Courier New',monospace;font-size:13px;font-weight:700;color:#059669;background:#d1fae5;border:1px solid #a7f3d0;padding:7px 13px;border-radius:9px;white-space:nowrap}
  /* notes */
  .notes{margin-top:22px;padding:16px 18px;background:#fffbeb;border:1.5px solid #fde68a;border-radius:10px}
  .notes-lbl{font-size:9px;font-weight:700;color:#92400e;letter-spacing:2px;text-transform:uppercase;margin-bottom:7px}
  .notes-txt{font-size:13px;color:#78350f;line-height:1.65}
  /* signatures */
  .sigs{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:52px;padding-top:32px;border-top:2px dashed #e5e7eb}
  .sig-box{text-align:center}
  .sig-line{border-top:1.5px solid #d1d5db;padding-top:44px;margin-bottom:8px}
  .sig-lbl{font-size:10px;color:#9ca3af;font-weight:600}
  .sig-name{font-size:13px;color:#374151;font-weight:700;margin-top:3px}
  /* footer */
  .ftr{background:#f9fafb;border-top:1px solid #f0f0f0;padding:22px 44px;display:flex;justify-content:space-between;align-items:center}
  .ftr-brand{font-size:13px;font-weight:700;color:#374151}
  .ftr-contact{font-size:11px;color:#9ca3af;margin-top:2px}
  .ftr-note{font-size:11px;color:#9ca3af;text-align:right;line-height:1.6}
  /* watermark */
  .wm{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:76px;font-weight:900;color:rgba(0,0,0,.028);letter-spacing:8px;pointer-events:none;white-space:nowrap;z-index:0}
  @media print{
    body{background:#fff}
    .wrap{box-shadow:none;margin:0;border-radius:0;max-width:100%}
    .no-print{display:none!important}
    @page{margin:.5cm}
  }
</style>
</head>
<body>
<div class="wm">PAUL PHOTOGRAPHY</div>
<div class="wrap">

  <!-- Header -->
  <div class="hdr">
    <div class="brand">
      <div class="brand-icon">📸</div>
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
          <td style="padding:14px 14px;border-bottom:1px solid #f3f4f6">
            <div style="font-size:14px;font-weight:600;color:#111">${data.shootType} — Photography / Media Service</div>
            ${data.shootDate ? `<div style="font-size:11px;color:#9ca3af;margin-top:3px">📅 Scheduled: ${data.shootDate}</div>` : ''}
            ${data.location ? `<div style="font-size:11px;color:#9ca3af;margin-top:2px">📍 Location: ${data.location}</div>` : ''}
          </td>
          <td style="padding:14px 14px;border-bottom:1px solid #f3f4f6;font-size:15px;font-weight:700;color:#111;text-align:right;white-space:nowrap">UGX ${data.amountPaid}</td>
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
      <div class="ftr-brand">Paul Photography</div>
      <div class="ftr-contact">+256 757 460 297 &nbsp;•&nbsp; Kampala, Uganda</div>
    </div>
    <div class="ftr-note">
      Official payment receipt.<br>
      Thank you for choosing Paul Photography! 🙏
    </div>
  </div>
</div>

<!-- Print toolbar (hidden in print) -->
<div class="no-print" style="max-width:700px;margin:20px auto;display:flex;gap:12px;padding:0 4px">
  <button onclick="window.print()"
    style="flex:1;padding:14px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">
    🖨️ &nbsp; Print / Save as PDF
  </button>
  <button onclick="window.close()"
    style="padding:14px 20px;background:#f3f4f6;color:#374151;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer">
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
