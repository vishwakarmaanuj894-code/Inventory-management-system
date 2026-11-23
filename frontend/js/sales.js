/**
 * Smart Inventory Management System - Sales Module
 * Handles sales order creation, real-time stock availability checking,
 * insufficient stock blockers, automatic stock deduction, history ledger, and printable invoices.
 */

const SalesModule = {
  activeSaleItems: [],

  async init() {
    await this.render();
  },

  async render() {
    const container = document.getElementById('module-sales');
    if (!container) return;

    const [salesRes, productsRes] = await Promise.all([
      api.sales.getAll(),
      api.products.getAll()
    ]);

    const sales = salesRes.data || [];
    this.products = productsRes.data || [];

    const totalRevenue = sales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Sales Orders & Customer Invoicing</h1>
          <p class="page-subtitle">Generate GST sales invoices, verify stock availability live, deduct inventory automatically, and print bills.</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="SalesModule.openNewSaleModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            + Create New Sale Invoice
          </button>
        </div>
      </div>

      <!-- Quick Metrics -->
      <div class="metrics-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom: 20px;">
        <div class="metric-card" style="padding: 16px;">
          <div style="font-size: 12px; color: var(--text-muted); font-weight: 600;">Total Invoiced Sales</div>
          <div style="font-size: 22px; font-weight: 700; margin-top: 4px;" class="font-mono">${sales.length} Invoices</div>
        </div>
        <div class="metric-card" style="padding: 16px;">
          <div style="font-size: 12px; color: var(--text-muted); font-weight: 600;">Gross Sales Revenue</div>
          <div style="font-size: 22px; font-weight: 700; margin-top: 4px; color: var(--color-primary);" class="font-mono">${formatINR(totalRevenue)}</div>
        </div>
        <div class="metric-card" style="padding: 16px;">
          <div style="font-size: 12px; color: var(--text-muted); font-weight: 600;">Active Catalog Items</div>
          <div style="font-size: 22px; font-weight: 700; margin-top: 4px;" class="font-mono">${this.products.length} SKUs</div>
        </div>
      </div>

      <div class="data-card">
        <div class="data-card-header">
          <h2 class="card-title">Sales Invoices & Dispatch Ledger</h2>
          <span style="font-size: 13px; color: var(--text-muted);">Stock automatically deducted upon checkout</span>
        </div>

        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer / Client</th>
                <th>Date</th>
                <th class="text-center">Items</th>
                <th>Payment Mode</th>
                <th class="text-right">Grand Total</th>
                <th class="text-center">Payment Status</th>
                <th class="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              ${sales.length === 0 ? `
                <tr>
                  <td colspan="8">
                    <div class="empty-state">
                      <h3 class="empty-state-title">No sales invoices yet</h3>
                      <p class="empty-state-desc">Generate your first customer invoice by clicking "+ Create New Sale Invoice".</p>
                      <button class="btn btn-primary btn-sm" onclick="SalesModule.openNewSaleModal()">+ Create Sale</button>
                    </div>
                  </td>
                </tr>
              ` : sales.map(s => `
                <tr>
                  <td class="font-mono font-bold" style="color: var(--color-primary);">${s.invoiceNumber}</td>
                  <td>
                    <div style="font-weight: 600;">${s.customerName || 'Walk-in Customer'}</div>
                    <div class="text-muted" style="font-size: 11.5px;">${s.customerPhone || ''}</div>
                  </td>
                  <td class="font-mono text-muted" style="font-size: 12px;">${formatDate(s.createdAt)}</td>
                  <td class="text-center font-mono">
                    <span class="badge badge-purple">${s.items.length} items</span>
                  </td>
                  <td>${s.paymentMethod || 'UPI'}</td>
                  <td class="text-right font-mono font-bold">${formatINR(s.grandTotal)}</td>
                  <td class="text-center">
                    <span class="badge badge-success">✓ ${s.status || 'Paid'}</span>
                  </td>
                  <td class="text-right">
                    <button class="btn btn-outline btn-sm" onclick="SalesModule.viewInvoice('${s._id}')">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      View Invoice
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div id="sales-modal-root"></div>
    `;
  },

  openNewSaleModal() {
    if (this.products.length === 0) {
      App.showToast("No products found in catalog. Add products first.", "warning");
      App.navigateTo('products');
      return;
    }

    // Pick first available product with stock > 0 if possible
    const availableProd = this.products.find(p => p.stockQuantity > 0) || this.products[0];

    this.activeSaleItems = [
      {
        productId: availableProd._id,
        productName: availableProd.name,
        sku: availableProd.sku,
        availableStock: availableProd.stockQuantity,
        quantity: availableProd.stockQuantity > 0 ? 1 : 0,
        sellingPrice: availableProd.sellingPrice || 150,
        total: availableProd.stockQuantity > 0 ? (availableProd.sellingPrice || 150) : 0
      }
    ];

    const invoiceNumber = `INV-2026-${String(Date.now()).slice(-4)}`;

    const modalRoot = document.getElementById('sales-modal-root');
    modalRoot.innerHTML = `
      <div class="modal-overlay active" id="sales-modal">
        <div class="modal-container modal-xl">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">Generate Customer Sales Invoice</h3>
              <div style="font-size: 12px; color: var(--text-muted);">Stock availability is checked live; insufficient stock prevents dispatch</div>
            </div>
            <button class="btn btn-ghost btn-icon-only" onclick="SalesModule.closeModal()">✕</button>
          </div>
          <form id="sales-form" onsubmit="SalesModule.saveSale(event)">
            <div class="modal-body">
              <div class="form-row" style="display: flex; gap: 16px; margin-bottom: 14px;">
                <div class="form-group" style="flex: 1;">
                  <label class="form-label required">Invoice Reference #</label>
                  <input type="text" name="invoiceNumber" class="form-control font-mono" required value="${invoiceNumber}" />
                </div>
                <div class="form-group" style="flex: 1.5;">
                  <label class="form-label required">Customer / Company Name</label>
                  <input type="text" name="customerName" class="form-control" required placeholder="e.g. Venkateshwara Mart / Rohit Verma" />
                </div>
                <div class="form-group" style="flex: 1;">
                  <label class="form-label">Customer Mobile</label>
                  <input type="tel" name="customerPhone" class="form-control font-mono" placeholder="+91 98450 00000" />
                </div>
                <div class="form-group" style="flex: 1;">
                  <label class="form-label required">Payment Mode</label>
                  <select name="paymentMethod" class="form-control">
                    <option value="UPI">UPI (GooglePay / PhonePe / Paytm)</option>
                    <option value="Cash">Cash</option>
                    <option value="Credit Card">Credit / Debit Card</option>
                    <option value="Net Banking">Net Banking</option>
                  </select>
                </div>
              </div>

              <!-- Product Line Items Section -->
              <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; background-color: var(--bg-surface);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                  <strong style="font-size: 14px; color: var(--text-primary);">Sale Items & Live Stock Check</strong>
                  <button type="button" class="btn btn-outline btn-sm" onclick="SalesModule.addLineItem()">
                    + Add Another Product
                  </button>
                </div>

                <div class="table-responsive">
                  <table class="invoice-items-table">
                    <thead>
                      <tr>
                        <th style="min-width: 260px;">Product Selection</th>
                        <th style="width: 140px;" class="text-center">Available Stock</th>
                        <th style="width: 110px;" class="text-center">Sale Qty</th>
                        <th style="width: 140px;" class="text-right">Unit Price (₹)</th>
                        <th style="width: 140px;" class="text-right">Line Total (₹)</th>
                        <th style="width: 50px;"></th>
                      </tr>
                    </thead>
                    <tbody id="sales-items-body">
                      <!-- Rendered by SalesModule.renderItemsTable() -->
                    </tbody>
                  </table>
                </div>

                <!-- Invoice Summary & Taxes -->
                <div class="invoice-summary-box">
                  <div class="summary-row">
                    <span>Items Subtotal:</span>
                    <span class="font-mono" id="sale-subtotal">₹0.00</span>
                  </div>
                  <div class="summary-row">
                    <span>GST Rate (%):</span>
                    <input type="number" min="0" max="28" id="sale-tax-rate" value="18" style="width: 70px; padding: 4px 6px; border: 1px solid var(--border-color); border-radius: 4px; text-align: right;" class="font-mono" oninput="SalesModule.recalculateTotals()" />
                  </div>
                  <div class="summary-row">
                    <span>Tax Amount:</span>
                    <span class="font-mono" id="sale-tax-amount">₹0.00</span>
                  </div>
                  <div class="summary-row">
                    <span>Discount (₹):</span>
                    <input type="number" min="0" id="sale-discount" value="0" style="width: 90px; padding: 4px 6px; border: 1px solid var(--border-color); border-radius: 4px; text-align: right;" class="font-mono" oninput="SalesModule.recalculateTotals()" />
                  </div>
                  <div class="summary-row total-row">
                    <span>Total Billable:</span>
                    <span class="font-mono text-brand-purple" id="sale-grand-total">₹0.00</span>
                  </div>
                </div>
              </div>

              <div class="form-group" style="margin-top: 16px; margin-bottom: 0;">
                <label class="form-label">Invoice Notes / Customer Instructions</label>
                <textarea name="notes" class="form-control" rows="2" placeholder="e.g. Standard warranty applies, delivery via BlueDart..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" onclick="SalesModule.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Complete Sale & Deduct Stock</button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.renderItemsTable();
    this.recalculateTotals();
  },

  renderItemsTable() {
    const tbody = document.getElementById('sales-items-body');
    if (!tbody) return;

    tbody.innerHTML = this.activeSaleItems.map((item, index) => {
      const isInsufficient = item.quantity > item.availableStock;
      const isZero = item.availableStock === 0;

      return `
        <tr style="${isInsufficient ? 'background-color: var(--color-danger-bg);' : ''}">
          <td>
            <select class="form-control" onchange="SalesModule.handleProductSelect(${index}, this.value)">
              ${this.products.map(p => `
                <option value="${p._id}" ${item.productId === p._id ? 'selected' : ''}>
                  ${p.name} (Stock: ${p.stockQuantity})
                </option>
              `).join('')}
            </select>
          </td>
          <td class="text-center font-mono">
            <span class="badge ${isZero ? 'badge-danger' : item.availableStock <= 10 ? 'badge-warning' : 'badge-success'}">
              ${item.availableStock} in stock
            </span>
          </td>
          <td>
            <input type="number" min="1" max="${item.availableStock}" class="form-control font-mono text-center ${isInsufficient ? 'border-danger' : ''}" value="${item.quantity}" oninput="SalesModule.handleQuantityChange(${index}, this.value)" />
            ${isInsufficient ? `<div style="font-size: 10px; color: var(--color-danger); margin-top: 2px;">Exceeds stock!</div>` : ''}
          </td>
          <td>
            <input type="number" min="0" step="any" class="form-control font-mono text-right" value="${item.sellingPrice}" oninput="SalesModule.handlePriceChange(${index}, this.value)" />
          </td>
          <td class="text-right font-mono font-bold" style="padding-right: 12px;">
            ${formatINR(item.total)}
          </td>
          <td class="text-center">
            ${this.activeSaleItems.length > 1 ? `
              <button type="button" class="action-btn delete-btn" onclick="SalesModule.removeItem(${index})" title="Remove item">
                ✕
              </button>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');
  },

  addLineItem() {
    const availableProd = this.products.find(p => p.stockQuantity > 0) || this.products[0];
    this.activeSaleItems.push({
      productId: availableProd._id,
      productName: availableProd.name,
      sku: availableProd.sku,
      availableStock: availableProd.stockQuantity,
      quantity: availableProd.stockQuantity > 0 ? 1 : 0,
      sellingPrice: availableProd.sellingPrice || 150,
      total: availableProd.stockQuantity > 0 ? (availableProd.sellingPrice || 150) : 0
    });
    this.renderItemsTable();
    this.recalculateTotals();
  },

  removeItem(index) {
    if (this.activeSaleItems.length > 1) {
      this.activeSaleItems.splice(index, 1);
      this.renderItemsTable();
      this.recalculateTotals();
    }
  },

  handleProductSelect(index, productId) {
    const prod = this.products.find(p => p._id === productId);
    if (prod) {
      this.activeSaleItems[index].productId = prod._id;
      this.activeSaleItems[index].productName = prod.name;
      this.activeSaleItems[index].sku = prod.sku;
      this.activeSaleItems[index].availableStock = prod.stockQuantity;
      this.activeSaleItems[index].sellingPrice = prod.sellingPrice || 150;
      this.activeSaleItems[index].quantity = prod.stockQuantity > 0 ? 1 : 0;
      this.activeSaleItems[index].total = this.activeSaleItems[index].sellingPrice * this.activeSaleItems[index].quantity;
      this.renderItemsTable();
      this.recalculateTotals();
    }
  },

  handleQuantityChange(index, qty) {
    const q = parseInt(qty, 10) || 0;
    this.activeSaleItems[index].quantity = q;
    this.activeSaleItems[index].total = this.activeSaleItems[index].sellingPrice * q;
    this.renderItemsTable();
    this.recalculateTotals();
  },

  handlePriceChange(index, price) {
    const p = Math.max(0, parseFloat(price) || 0);
    this.activeSaleItems[index].sellingPrice = p;
    this.activeSaleItems[index].total = p * this.activeSaleItems[index].quantity;
    this.renderItemsTable();
    this.recalculateTotals();
  },

  recalculateTotals() {
    const subtotal = this.activeSaleItems.reduce((sum, item) => sum + item.total, 0);
    const taxRate = parseFloat(document.getElementById('sale-tax-rate')?.value) || 0;
    const discount = parseFloat(document.getElementById('sale-discount')?.value) || 0;

    const taxAmount = (subtotal * taxRate) / 100;
    const grandTotal = Math.max(0, subtotal + taxAmount - discount);

    const subtotalEl = document.getElementById('sale-subtotal');
    const taxAmountEl = document.getElementById('sale-tax-amount');
    const grandTotalEl = document.getElementById('sale-grand-total');

    if (subtotalEl) subtotalEl.innerText = formatINR(subtotal);
    if (taxAmountEl) taxAmountEl.innerText = formatINR(taxAmount);
    if (grandTotalEl) grandTotalEl.innerText = formatINR(grandTotal);

    this.calculated = { subtotal, taxRate, taxAmount, discount, grandTotal };
  },

  closeModal() {
    const modal = document.getElementById('sales-modal');
    if (modal) modal.remove();
  },

  async saveSale(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    // PREVENT SALES WHEN STOCK IS INSUFFICIENT
    for (const item of this.activeSaleItems) {
      if (item.quantity <= 0) {
        App.showToast(`Please enter a quantity greater than 0 for '${item.productName}'`, 'warning');
        return;
      }
      if (item.quantity > item.availableStock) {
        App.showToast(`Cannot sell '${item.productName}': requested quantity (${item.quantity}) exceeds available inventory (${item.availableStock}).`, 'error');
        return;
      }
    }

    const payload = {
      invoiceNumber: formData.get('invoiceNumber').trim(),
      customerName: formData.get('customerName').trim(),
      customerPhone: formData.get('customerPhone').trim(),
      paymentMethod: formData.get('paymentMethod'),
      items: this.activeSaleItems,
      subtotal: this.calculated.subtotal,
      taxRate: this.calculated.taxRate,
      taxAmount: this.calculated.taxAmount,
      discount: this.calculated.discount,
      grandTotal: this.calculated.grandTotal,
      notes: formData.get('notes'),
      status: 'Completed'
    };

    const res = await api.sales.create(payload);
    if (res.success) {
      App.showToast("Sale invoice processed successfully! Warehouse inventory has been deducted.", "success");
      this.closeModal();
      await this.render();
      DashboardModule.render();
      ProductsModule.render();
      InventoryModule.render();
    } else {
      App.showToast(res.error || "Failed to process sale", "error");
    }
  },

  async viewInvoice(saleId) {
    const res = await api.sales.getById(saleId);
    if (!res.success) {
      App.showToast("Invoice not found", "error");
      return;
    }
    const s = res.data;
    const settingsRes = await api.settings.get();
    const settings = settingsRes.data || {};

    const modalRoot = document.getElementById('sales-modal-root');
    modalRoot.innerHTML = `
      <div class="modal-overlay active" id="sales-modal">
        <div class="modal-container modal-xl">
          <div class="modal-header no-print">
            <h3 class="modal-title">GST Tax Invoice: ${s.invoiceNumber}</h3>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-primary btn-sm" onclick="window.print()">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                Print Invoice
              </button>
              <button class="btn btn-ghost btn-icon-only" onclick="SalesModule.closeModal()">✕</button>
            </div>
          </div>
          <div class="modal-body" style="background-color: var(--bg-surface-subtle); padding: 24px;">
            <div class="printable-invoice">
              <div class="invoice-brand-row">
                <div>
                  <h2 style="font-size: 22px; font-weight: 800; color: #6C4CF1; margin-bottom: 4px;">TAX INVOICE</h2>
                  <div style="font-size: 13px; color: #64748B;">Issued under GST Rules, Government of India</div>
                </div>
                <div style="text-align: right;">
                  <div class="font-mono" style="font-size: 18px; font-weight: 700; color: #0F172A;">${s.invoiceNumber}</div>
                  <div style="font-size: 13px; color: #64748B;">Date: ${formatDate(s.createdAt)}</div>
                  <div style="font-size: 13px; color: #64748B;">Payment: <strong style="color: #047857;">PAID (${s.paymentMethod || 'UPI'})</strong></div>
                </div>
              </div>

              <div class="invoice-bill-grid">
                <div class="invoice-party-box">
                  <div class="invoice-party-title">Sold By (Supplier / Seller)</div>
                  <strong style="font-size: 14px; color: #0F172A;">${settings.companyName || 'Bharat Logistics'}</strong>
                  <div style="font-size: 12.5px; color: #475569; margin-top: 4px;">
                    ${settings.address || ''}<br/>
                    ${settings.city || ''}, ${settings.state || ''} - ${settings.pincode || ''}<br/>
                    GSTIN: <span class="font-mono"><strong>${settings.gstin || '-'}</strong></span><br/>
                    Contact: ${settings.phone || '-'}
                  </div>
                </div>

                <div class="invoice-party-box">
                  <div class="invoice-party-title">Billed To (Customer / Buyer)</div>
                  <strong style="font-size: 14px; color: #0F172A;">${s.customerName || 'Walk-in Retail Customer'}</strong>
                  <div style="font-size: 12.5px; color: #475569; margin-top: 4px;">
                    Mobile: <span class="font-mono">${s.customerPhone || 'Not provided'}</span><br/>
                    Email: ${s.customerEmail || '-'}<br/>
                    Place of Supply: ${settings.state || 'Karnataka'} (State Code: 29)
                  </div>
                </div>
              </div>

              <table class="table" style="margin-bottom: 24px; border: 1px solid #E2E8F0;">
                <thead>
                  <tr style="background-color: #F8FAFC;">
                    <th style="width: 40px;">#</th>
                    <th>Item Description</th>
                    <th>SKU Code</th>
                    <th class="text-center">Qty</th>
                    <th class="text-right">Unit Rate (₹)</th>
                    <th class="text-right">Taxable Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  ${s.items.map((it, idx) => `
                    <tr>
                      <td class="font-mono text-muted">${idx + 1}</td>
                      <td style="font-weight: 600;">${it.productName}</td>
                      <td class="sku-code">${it.sku}</td>
                      <td class="text-center font-mono font-bold">${it.quantity}</td>
                      <td class="text-right font-mono">${formatINR(it.sellingPrice)}</td>
                      <td class="text-right font-mono font-bold">${formatINR(it.total)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="max-width: 400px; font-size: 12.5px; color: #64748B;">
                  <strong>Terms & Conditions:</strong><br/>
                  1. Goods once sold cannot be returned after 7 days.<br/>
                  2. All disputes subject to local jurisdiction.<br/>
                  ${s.notes ? `Remarks: ${s.notes}<br/>` : ''}
                  Thank you for your business!
                </div>

                <div style="width: 280px; background-color: #F8FAFC; padding: 14px; border-radius: 8px; border: 1px solid #E2E8F0;">
                  <div class="summary-row" style="color: #475569;">
                    <span>Subtotal:</span>
                    <span class="font-mono font-bold">${formatINR(s.subtotal)}</span>
                  </div>
                  <div class="summary-row" style="color: #475569;">
                    <span>CGST + SGST (${s.taxRate}%):</span>
                    <span class="font-mono">${formatINR(s.taxAmount)}</span>
                  </div>
                  ${s.discount > 0 ? `
                    <div class="summary-row" style="color: #475569;">
                      <span>Discount:</span>
                      <span class="font-mono text-success">- ${formatINR(s.discount)}</span>
                    </div>
                  ` : ''}
                  <div class="summary-row total-row" style="border-top: 2px solid #E2E8F0; margin-top: 8px; padding-top: 8px;">
                    <span>Grand Total:</span>
                    <span class="font-mono text-brand-purple" style="font-size: 16px;">${formatINR(s.grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer no-print">
            <button class="btn btn-outline" onclick="SalesModule.closeModal()">Close</button>
            <button class="btn btn-primary" onclick="window.print()">
              Print Sales Bill
            </button>
          </div>
        </div>
      </div>
    `;
  }
};

window.SalesModule = SalesModule;
