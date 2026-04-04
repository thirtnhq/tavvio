export interface InvoiceLineItem {
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

export interface CustomerAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  country: string;
  zip?: string;
}

export interface InvoiceTemplateData {
  id: string;
  invoiceNumber?: string;
  createdAt: Date;
  dueDate?: Date;
  status: string;
  currency: string;
  // Merchant branding
  merchantName: string;
  merchantEmail: string;
  merchantLogo?: string;
  merchantBrandColor?: string;
  merchantCompany?: string;
  // Customer
  customerName?: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: CustomerAddress;
  // Line items & totals
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  discount?: number;
  total: number;
  amountPaid: number;
  // Optional
  notes?: string;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function getStatusBadge(status: string): { label: string; color: string; bg: string } {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    DRAFT: { label: 'Draft', color: '#6b7280', bg: '#f3f4f6' },
    SENT: { label: 'Sent', color: '#2563eb', bg: '#eff6ff' },
    VIEWED: { label: 'Viewed', color: '#7c3aed', bg: '#f5f3ff' },
    PARTIALLY_PAID: { label: 'Partially Paid', color: '#d97706', bg: '#fffbeb' },
    PAID: { label: 'Paid', color: '#059669', bg: '#ecfdf5' },
    OVERDUE: { label: 'Overdue', color: '#dc2626', bg: '#fef2f2' },
    CANCELLED: { label: 'Cancelled', color: '#9ca3af', bg: '#f9fafb' },
  };
  return map[status] ?? { label: status, color: '#6b7280', bg: '#f3f4f6' };
}

export function renderInvoiceHtml(data: InvoiceTemplateData): string {
  const brand = data.merchantBrandColor ?? '#2563eb';
  const badge = getStatusBadge(data.status);
  const remaining = data.total - data.amountPaid;

  const lineItemRows = data.lineItems
    .map(
      (item) => `
      <tr>
        <td class="item-desc">${escapeHtml(item.description)}</td>
        <td class="item-qty">${item.qty}</td>
        <td class="item-price">${formatCurrency(item.unitPrice, data.currency)}</td>
        <td class="item-amount">${formatCurrency(item.amount, data.currency)}</td>
      </tr>`,
    )
    .join('');

  const customerAddressHtml = data.customerAddress
    ? `
    <div class="address-block">
      <div>${escapeHtml(data.customerAddress.line1)}</div>
      ${data.customerAddress.line2 ? `<div>${escapeHtml(data.customerAddress.line2)}</div>` : ''}
      <div>${escapeHtml(data.customerAddress.city)}${data.customerAddress.state ? `, ${escapeHtml(data.customerAddress.state)}` : ''} ${data.customerAddress.zip ?? ''}</div>
      <div>${escapeHtml(data.customerAddress.country)}</div>
    </div>`
    : '';

  const logoHtml = data.merchantLogo
    ? `<img src="${escapeHtml(data.merchantLogo)}" alt="${escapeHtml(data.merchantName)}" class="logo" />`
    : `<div class="logo-placeholder" style="color:${brand}">${escapeHtml(data.merchantName.charAt(0).toUpperCase())}</div>`;

  const discountRow =
    data.discount && data.discount > 0
      ? `<tr><td>Discount</td><td class="amount-cell">-${formatCurrency(data.discount, data.currency)}</td></tr>`
      : '';

  const taxRow =
    data.taxAmount && data.taxAmount > 0
      ? `<tr><td>Tax${data.taxRate ? ` (${(data.taxRate * 100).toFixed(1)}%)` : ''}</td><td class="amount-cell">${formatCurrency(data.taxAmount, data.currency)}</td></tr>`
      : '';

  const amountPaidRow =
    data.amountPaid > 0
      ? `<tr><td>Amount Paid</td><td class="amount-cell amount-paid">-${formatCurrency(data.amountPaid, data.currency)}</td></tr>`
      : '';

  const remainingRow =
    data.amountPaid > 0 && remaining > 0
      ? `<tr class="total-row"><td><strong>Amount Due</strong></td><td class="amount-cell"><strong>${formatCurrency(remaining, data.currency)}</strong></td></tr>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${data.invoiceNumber ?? data.id}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 13px;
      color: #111827;
      background: #fff;
      padding: 48px;
      line-height: 1.5;
    }

    /* ── Header ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 24px;
      border-bottom: 2px solid ${brand};
    }

    .logo {
      height: 56px;
      width: auto;
      object-fit: contain;
    }

    .logo-placeholder {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      background: ${brand}18;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 700;
      border: 2px solid ${brand}40;
    }

    .header-right {
      text-align: right;
    }

    .invoice-title {
      font-size: 28px;
      font-weight: 700;
      color: ${brand};
      letter-spacing: -0.5px;
    }

    .invoice-number {
      font-size: 13px;
      color: #6b7280;
      margin-top: 4px;
    }

    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-top: 8px;
      background: ${badge.bg};
      color: ${badge.color};
    }

    /* ── Merchant & Customer ── */
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-bottom: 32px;
    }

    .party-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #9ca3af;
      margin-bottom: 8px;
    }

    .party-name {
      font-size: 15px;
      font-weight: 600;
      color: #111827;
    }

    .party-detail {
      font-size: 12px;
      color: #6b7280;
      margin-top: 2px;
    }

    .address-block {
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
      line-height: 1.6;
    }

    /* ── Meta dates ── */
    .meta-row {
      display: flex;
      gap: 32px;
      margin-bottom: 32px;
      padding: 16px 20px;
      background: #f9fafb;
      border-radius: 8px;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .meta-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #9ca3af;
    }

    .meta-value {
      font-size: 13px;
      font-weight: 500;
      color: #111827;
    }

    .meta-value.overdue {
      color: #dc2626;
      font-weight: 600;
    }

    /* ── Line items table ── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }

    thead tr {
      background: ${brand};
      color: #fff;
    }

    thead th {
      padding: 10px 14px;
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    thead th:last-child,
    thead th:nth-child(2),
    thead th:nth-child(3) {
      text-align: right;
    }

    tbody tr {
      border-bottom: 1px solid #f3f4f6;
    }

    tbody tr:nth-child(even) {
      background: #fafafa;
    }

    tbody td {
      padding: 10px 14px;
      font-size: 13px;
      color: #374151;
      vertical-align: top;
    }

    .item-qty,
    .item-price,
    .item-amount {
      text-align: right;
      white-space: nowrap;
    }

    .item-amount {
      font-weight: 500;
    }

    /* ── Totals ── */
    .totals-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 32px;
    }

    .totals-table {
      width: 280px;
    }

    .totals-table td {
      padding: 6px 14px;
      font-size: 13px;
      color: #374151;
    }

    .totals-table .amount-cell {
      text-align: right;
      font-weight: 500;
    }

    .totals-table .amount-paid {
      color: #059669;
    }

    .totals-table tr.subtotal-row td {
      border-top: 1px solid #e5e7eb;
      padding-top: 10px;
    }

    .totals-table tr.total-row td {
      border-top: 2px solid ${brand};
      padding-top: 10px;
      font-size: 15px;
      color: ${brand};
    }

    /* ── Notes ── */
    .notes-section {
      margin-bottom: 32px;
      padding: 16px 20px;
      background: #f9fafb;
      border-left: 3px solid ${brand};
      border-radius: 0 8px 8px 0;
    }

    .notes-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #9ca3af;
      margin-bottom: 6px;
    }

    .notes-text {
      font-size: 12px;
      color: #6b7280;
      line-height: 1.6;
      white-space: pre-line;
    }

    /* ── Footer ── */
    .footer {
      border-top: 1px solid #e5e7eb;
      padding-top: 20px;
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
    }

    .footer strong {
      color: ${brand};
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div class="header-left">
      ${logoHtml}
      <div style="margin-top: 10px; font-size: 14px; font-weight: 600; color: #111827;">
        ${escapeHtml(data.merchantCompany ?? data.merchantName)}
      </div>
      <div style="font-size: 12px; color: #6b7280;">${escapeHtml(data.merchantEmail)}</div>
    </div>
    <div class="header-right">
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-number">${escapeHtml(data.invoiceNumber ?? data.id)}</div>
      <div><span class="status-badge">${badge.label}</span></div>
    </div>
  </div>

  <!-- Parties -->
  <div class="parties">
    <div class="party">
      <div class="party-label">From</div>
      <div class="party-name">${escapeHtml(data.merchantCompany ?? data.merchantName)}</div>
      <div class="party-detail">${escapeHtml(data.merchantEmail)}</div>
    </div>
    <div class="party">
      <div class="party-label">Bill To</div>
      <div class="party-name">${data.customerName ? escapeHtml(data.customerName) : escapeHtml(data.customerEmail)}</div>
      ${data.customerName ? `<div class="party-detail">${escapeHtml(data.customerEmail)}</div>` : ''}
      ${data.customerPhone ? `<div class="party-detail">${escapeHtml(data.customerPhone)}</div>` : ''}
      ${customerAddressHtml}
    </div>
  </div>

  <!-- Meta dates -->
  <div class="meta-row">
    <div class="meta-item">
      <span class="meta-label">Invoice Date</span>
      <span class="meta-value">${formatDate(data.createdAt)}</span>
    </div>
    ${
      data.dueDate
        ? `<div class="meta-item">
      <span class="meta-label">Due Date</span>
      <span class="meta-value ${data.dueDate < new Date() && data.status !== 'PAID' ? 'overdue' : ''}">
        ${formatDate(data.dueDate)}
      </span>
    </div>`
        : ''
    }
    <div class="meta-item">
      <span class="meta-label">Currency</span>
      <span class="meta-value">${escapeHtml(data.currency)}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Amount Due</span>
      <span class="meta-value" style="font-weight:700;color:${brand};">
        ${formatCurrency(remaining > 0 ? remaining : data.total, data.currency)}
      </span>
    </div>
  </div>

  <!-- Line items -->
  <table>
    <thead>
      <tr>
        <th style="width:50%">Description</th>
        <th style="width:10%">Qty</th>
        <th style="width:20%">Unit Price</th>
        <th style="width:20%">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemRows}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals-wrapper">
    <table class="totals-table">
      <tbody>
        <tr class="subtotal-row">
          <td>Subtotal</td>
          <td class="amount-cell">${formatCurrency(data.subtotal, data.currency)}</td>
        </tr>
        ${discountRow}
        ${taxRow}
        <tr class="total-row">
          <td><strong>Total</strong></td>
          <td class="amount-cell"><strong>${formatCurrency(data.total, data.currency)}</strong></td>
        </tr>
        ${amountPaidRow}
        ${remainingRow}
      </tbody>
    </table>
  </div>

  <!-- Notes -->
  ${
    data.notes
      ? `<div class="notes-section">
    <div class="notes-label">Notes</div>
    <div class="notes-text">${escapeHtml(data.notes)}</div>
  </div>`
      : ''
  }

  <!-- Footer -->
  <div class="footer">
    <p>Thank you for your business &mdash; <strong>${escapeHtml(data.merchantCompany ?? data.merchantName)}</strong></p>
    <p style="margin-top:4px;">Questions? Contact us at ${escapeHtml(data.merchantEmail)}</p>
  </div>

</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
