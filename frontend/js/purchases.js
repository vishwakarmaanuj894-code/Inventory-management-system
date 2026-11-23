/**
 * Smart Inventory Management System - Purchases Module
 * Handles inward procurement invoices, multi-item row builder,
 * automatic stock replenishment, purchase history ledger, and printable invoices.
 */

const PurchasesModule = {
  activeInvoiceItems: [],

  async init() {
    await this.render();
  },

  async render() {
    const container = document.getElementById('module-purchases');
    if (!container) return;

    const [purchasesRes, suppliersRes, productsRes] = await Promise.all([
      api.purchases.getAll(),
      api.suppliers.getAll(),
      api.products.getAll()
    ]);

    const purchases = purchasesRes.data || [];
    this.suppliers = suppliersRes.data || [];
    this.products = productsRes.data || [];

    const totalSpent = purchases.reduce((sum, p) => sum + (p.grandTotal || 0), 0);

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Purchase Management & Inward Supply</h1>
          <p class="page-subtitle">Record supplier purchase bills, replenish warehouse inventory, and print GST purchase invoices.</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="PurchasesModule.openNewPurchaseModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            + Create Purchase Invoice
          </button>
        </div>
      </div>

      <!-- Quick Summary Stats -->
      <div class="metrics-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom: 20px;">
        <div class="metric-card" style="padding: 16px;">
          <div style="font-size: 12px; color: var(--text-muted); font-weight: 600;">Total Purchase Bills</div>
          <div style="font-size: 22px; font-weight: 700; margin-top: 4px;" class="font-mono">${purchases.length} Invoices</div>
        </div>
        <div class="metric-card" style="padding: 16px;">
          <div style="font-size: 12px; color: var(--text-muted); font-weight: 600;">Total Procurement Spend</div>
          <div style="font-size: 22px; font-weight: 700; margin-top: 4px; color: var(--color-primary);" class="font-mono">${formatINR(totalSpent)}</div>
        </div>
        <div class="metric-card" style="padding: 16px;">
          <div style="font-size: 12px; color: var(--text-muted); font-weight: 600;">Registered Suppliers</div>
          <div style="font-size: 22px; font-weight: 700; margin-top: 4px;" class="font-mono">${this.suppliers.length} Vendors</div>
        </div>
      </div>

      <div class="data-card">
        <div class="data-card-header">
          <h2 class="card-title">Purchase Invoice History</h2>
          <span style="font-size: 13px; color: var(--text-muted);">Stock automatically credited upon completion</span>
        </div>

        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Supplier / Vendor</th>
                <th>Date</th>
                <th class="text-center">Items Count</th>
                <th>Payment Mode</th>
                <th class="text-right">Total (₹)</th>
                <th class="text-center">Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${purchases.length === 0 ? `
                <tr>
                  <td colspan="8">
                    <div class="empty-state">
                      <h3 class="empty-state-title">No purchase invoices yet</h3>
                      <p class="empty-state-desc">Create your first purchase bill to restock your catalog items.</p>
                      <button class="btn btn-primary btn-sm" onclick="PurchasesModule.openNewPurchaseModal()">+ Create Purchase</button>
                    </div>
                  </td>
                </tr>
              ` : purchases.map(p => `
                <tr>
                  <td class="font-mono font-bold" style="color: var(--color-primary);">${p.invoiceNumber}</td>
                  <td>
                    <div style="font-weight: 600;">${p.supplierName}</div>
                  </td>
                  <td class="font-mono text-muted" style="font-size: 12px;">${formatDate(p.createdAt)}</td>
                  <td class="text-center font-mono">
                    <span class="badge badge-purple">${p.items.length} items</span>
                  </td>
                  <td>${p.paymentMethod || 'Bank Transfer'}</td>
                  <td class="text-right font-mono font-bold">${formatINR(p.grandTotal)}</td>
                  <td class="text-center">
                    <span class="badge badge-success">✓ ${p.status || 'Completed'}</span>
                  </td>
                  <td class="text-right">
                    <button class="btn btn-outline btn-sm" onclick="PurchasesModule.viewInvoice('${p._id}')">
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

      <div id="purchase-modal-root"></div>
    `;
  },

  openNewPurchaseModal(preselectedProductId = null) {
    if (this.suppliers.length === 0) {
      App.showToast("Please add at least one supplier before creating a purchase", "warning");
      App.navigateTo('suppliers');
      return;
    }
    if (this.products.length === 0) {
      App.showToast("Please add at least one product before creating a purchase", "warning");
      App.navigateTo('products');
      return;
    }

    // Initialize line items
    const defaultProduct = preselectedProductId
      ? this.products.find(p => p._id === preselectedProductId) || this.products[0]
      : this.products[0];

    this.activeInvoiceItems = [
      {
        productId: defaultProduct._id,
        productName: defaultProduct.name,
        sku: defaultProduct.sku,
        quantity: 10,
        purchasePrice: defaultProduct.purchasePrice || 100,
        total: (defaultProduct.purchasePrice || 100) * 10
      }
    ];

    const invoiceNumber = `PUR-2026-${String(Date.now()).slice(-4)}`;

    const modalRoot = document.getElementById('purchase-modal-root');
    modalRoot.innerHTML = `
      <div class="modal-overlay active" id="purchase-modal">
        <div class="modal-container modal-xl">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">Create Purchase Invoice</h3>
              <div style="font-size: 12px; color: var(--text-muted);">Stock quantities will automatically increase upon saving</div>
            </div>
            <button class="btn btn-ghost btn-icon-only" onclick="PurchasesModule.closeModal()">✕</button>
          </div>
          <form id="purchase-form" onsubmit="PurchasesModule.savePurchase(event)">
            <div class="modal-body">
              <div class="form-row" style="display: flex; gap: 16px; margin-bottom: 12px;">
                <div class="form-group" style="flex: 1;">
                  <label class="form-label required">Invoice Reference #</label>
                  <input type="text" name="invoiceNumber" class="form-control font-mono" required value="${invoiceNumber}" />
                </div>
                <div class="form-group" style="flex: 1.5;">
                  <label class="form-label required">Supplier / Vendor</label>
                  <select name="supplierId" class="form-control" required id="purchase-supplier-select">
                    ${this.suppliers.map(s => `<option value="${s._id}">${s.company} (${s.name}) - ${s.city}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group" style="flex: 1;">
                  <label class="form-label required">Payment Method</label>
                  <select name="paymentMethod" class="form-control">
                    <option value="Bank Transfer (NEFT)">Bank Transfer (NEFT)</option>
                    <option value="RTGS">RTGS</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>

              <!-- Product Line Items Section -->
              <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; background-color: var(--bg-surface);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                  <strong style="font-size: 14px; color: var(--text-primary);">Purchase Line Items</strong>
                  <button type="button" class="btn btn-outline btn-sm" onclick="PurchasesModule.addLineItem()">
                    + Add Another Item
                  </button>
                </div>

                <div class="table-responsive">
                  <table class="invoice-items-table">
                    <thead>
                      <tr>
                        <th style="min-width: 250px;">Product</th>
                        <th style="width: 110px;" class="text-center">Quantity</th>
                        <th style="width: 140px;" class="text-right">Unit Cost (₹)</th>
                        <th style="width: 140px;" class="text-right">Line Total (₹)</th>
                        <th style="width: 50px;"></th>
                      </tr>
                    </thead>
                    <tbody id="purchase-items-body">
                      <!-- Rendered by PurchasesModule.renderItemsTable() -->
                    </tbody>
                  </table>
                </div>

                <!-- Invoice Totals Calculation Box -->
                <div class="invoice-summary-box">
                  <div class="summary-row">
                    <span>Subtotal:</span>
                    <span class="font-mono" id="purchase-subtotal">₹0.00</span>
                  </div>
                  <div class="summary-row">
                    <span>GST Tax Rate (%):</span>
                    <input type="number" min="0" max="28" id="purchase-tax-rate" value="18" style="width: 70px; padding: 4px 6px; border: 1px solid var(--border-color); border-radius: 4px; text-align: right;" class="font-mono" oninput="PurchasesModule.recalculateTotals()" />
                  </div>
                  <div class="summary-row">
                    <span>GST Amount:</span>
                    <span class="font-mono" id="purchase-tax-amount">₹0.00</span>
                  </div>
                  <div class="summary-row">
                    <span>Discount (₹):</span>
                    <input type="number" min="0" id="purchase-discount" value="0" style="width: 90px; padding: 4px 6px; border: 1px solid var(--border-color); border-radius: 4px; text-align: right;" class="font-mono" oninput="PurchasesModule.recalculateTotals()" />
                  </div>
                  <div class="summary-row total-row">
                    <span>Grand Total:</span>
                    <span class="font-mono text-brand-purple" id="purchase-grand-total">₹0.00</span>
                  </div>
                </div>
              </div>

              <div class="form-group" style="margin-top: 16px; margin-bottom: 0;">
                <label class="form-label">Procurement Remarks / Warehouse Notes</label>
                <textarea name="notes" class="form-control" rows="2" placeholder="e.g. Inward batch quality verified by warehouse manager..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" onclick="PurchasesModule.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Save & Replenish Stock</button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.renderItemsTable();
    this.recalculateTotals();
  },

  renderItemsTable() {
    const tbody = document.getElementById('purchase-items-body');
    if (!tbody) return;

    tbody.innerHTML = this.activeInvoiceItems.map((item, index) => `
      <tr>
        <td>
          <select class="form-control" onchange="PurchasesModule.handleProductSelect(${index}, this.value)">
            ${this.products.map(p => `
              <option value="${p._id}" ${item.productId === p._id ? 'selected' : ''}>
                ${p.name} (SKU: ${p.sku})
              </option>
            `).join('')}
          </select>
        </td>
        <td>
          <input type="number" min="1" class="form-control font-mono text-center" value="${item.quantity}" oninput="PurchasesModule.handleQuantityChange(${index}, this.value)" />
        </td>
        <td>
          <input type="number" min="0" step="any" class="form-control font-mono text-right" value="${item.purchasePrice}" oninput="PurchasesModule.handlePriceChange(${index}, this.value)" />
        </td>
        <td class="text-right font-mono font-bold" style="padding-right: 12px;">
          ${formatINR(item.total)}
        </td>
        <td class="text-center">
          ${this.activeInvoiceItems.length > 1 ? `
            <button type="button" class="action-btn delete-btn" onclick="PurchasesModule.removeItem(${index})" title="Remove line item">
              ✕
            </button>
          ` : ''}
        </td>
      </tr>
    `).join('');
  },

  addLineItem() {
    const firstProd = this.products[0];
    this.activeInvoiceItems.push({
      productId: firstProd._id,
      productName: firstProd.name,
      sku: firstProd.sku,
      quantity: 1,
      purchasePrice: firstProd.purchasePrice || 100,
      total: firstProd.purchasePrice || 100
    });
    this.renderItemsTable();
    this.recalculateTotals();
  },

  removeItem(index) {
    if (this.activeInvoiceItems.length > 1) {
      this.activeInvoiceItems.splice(index, 1);
      this.renderItemsTable();
      this.recalculateTotals();
    }
  },

  handleProductSelect(index, productId) {
    const prod = this.products.find(p => p._id === productId);
    if (prod) {
      this.activeInvoiceItems[index].productId = prod._id;
      this.activeInvoiceItems[index].productName = prod.name;
      this.activeInvoiceItems[index].sku = prod.sku;
      this.activeInvoiceItems[index].purchasePrice = prod.purchasePrice || 100;
      this.activeInvoiceItems[index].total = this.activeInvoiceItems[index].purchasePrice * this.activeInvoiceItems[index].quantity;
      this.renderItemsTable();
      this.recalculateTotals();
    }
  },

  handleQuantityChange(index, qty) {
    const q = Math.max(1, parseInt(qty, 10) || 1);
    this.activeInvoiceItems[index].quantity = q;
    this.activeInvoiceItems[index].total = this.activeInvoiceItems[index].purchasePrice * q;
    this.renderItemsTable();
    this.recalculateTotals();
  },

  handlePriceChange(index, price) {
    const p = Math.max(0, parseFloat(price) || 0);
    this.activeInvoiceItems[index].purchasePrice = p;
    this.activeInvoiceItems[index].total = p * this.activeInvoiceItems[index].quantity;
    this.renderItemsTable();
    this.recalculateTotals();
  },

  recalculateTotals() {
    const subtotal = this.activeInvoiceItems.reduce((sum, item) => sum + item.total, 0);
    const taxRate = parseFloat(document.getElementById('purchase-tax-rate')?.value) || 0;
    const discount = parseFloat(document.getElementById('purchase-discount')?.value) || 0;

    const taxAmount = (subtotal * taxRate) / 100;
    const grandTotal = Math.max(0, subtotal + taxAmount - discount);

    const subtotalEl = document.getElementById('purchase-subtotal');
    const taxAmountEl = document.getElementById('purchase-tax-amount');
    const grandTotalEl = document.getElementById('purchase-grand-total');

    if (subtotalEl) subtotalEl.innerText = formatINR(subtotal);
    if (taxAmountEl) taxAmountEl.innerText = formatINR(taxAmount);
    if (grandTotalEl) grandTotalEl.innerText = formatINR(grandTotal);

    this.calculated = { subtotal, taxRate, taxAmount, discount, grandTotal };
  },

  closeModal() {
    const modal = document.getElementById('purchase-modal');
    if (modal) modal.remove();
  },

  async savePurchase(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    const supplierId = formData.get('supplierId');
    const selectedSupplier = this.suppliers.find(s => s._id === supplierId);

    const payload = {
      invoiceNumber: formData.get('invoiceNumber').trim(),
      supplierId: supplierId,
      supplierName: selectedSupplier ? (selectedSupplier.company || selectedSupplier.name) : 'Supplier',
      paymentMethod: formData.get('paymentMethod'),
      items: this.activeInvoiceItems,
      subtotal: this.calculated.subtotal,
      taxRate: this.calculated.taxRate,
      taxAmount: this.calculated.taxAmount,
      discount: this.calculated.discount,
      grandTotal: this.calculated.grandTotal,
      notes: formData.get('notes'),
      status: 'Completed'
    };

    const res = await api.purchases.create(payload);
    if (res.success) {
      App.showToast("Purchase recorded successfully! Product stock has been increased.", "success");
      this.closeModal();
      await this.render();
      DashboardModule.render();
      ProductsModule.render();
      InventoryModule.render();
    } else {
      App.showToast(res.error || "Failed to create purchase", "error");
    }
  },

  async viewInvoice(purchaseId) {
    const res = await api.purchases.getById(purchaseId);
    if (!res.success) {
      App.showToast("Invoice not found", "error");
      return;
    }
    const p = res.data;
    const settingsRes = await api.settings.get();
    const settings = settingsRes.data || {};
    const sup = this.suppliers.find(s => s._id === p.supplierId) || {};

    const modalRoot = document.getElementById('purchase-modal-root');
    modalRoot.innerHTML = `
      <div class="modal-overlay active" id="purchase-modal">
        <div class="modal-container modal-xl">
          <div class="modal-header no-print">
            <h3 class="modal-title">Tax Invoice Preview: ${p.invoiceNumber}</h3>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-primary btn-sm" onclick="window.print()">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                Print Invoice
              </button>
              <button class="btn btn-ghost btn-icon-only" onclick="PurchasesModule.closeModal()">✕</button>
            </div>
          </div>
          <div class="modal-body" style="background-color: var(--bg-surface-subtle); padding: 24px;">
            <div class="printable-invoice">
              <div class="invoice-brand-row">
                <div>
                  <h2 style="font-size: 22px; font-weight: 800; color: #6C4CF1; margin-bottom: 4px;">PURCHASE INWARD VOUCHER</h2>
                  <div style="font-size: 13px; color: #64748B;">Official Warehouse Goods Receipt Note (GRN)</div>
                </div>
                <div style="text-align: right;">
                  <div class="font-mono" style="font-size: 18px; font-weight: 700; color: #0F172A;">${p.invoiceNumber}</div>
                  <div style="font-size: 13px; color: #64748B;">Date: ${formatDate(p.createdAt)}</div>
                  <div style="font-size: 13px; color: #64748B;">Status: <strong>${p.status}</strong></div>
                </div>
              </div>

              <div class="invoice-bill-grid">
                <div class="invoice-party-box">
                  <div class="invoice-party-title">Supplier (Vendor / Consignor)</div>
                  <strong style="font-size: 14px; color: #0F172A;">${p.supplierName}</strong>
                  <div style="font-size: 12.5px; color: #475569; margin-top: 4px;">
                    ${sup.address || ''}<br/>
                    ${sup.city || ''}, ${sup.state || ''}<br/>
                    Phone: ${sup.phone || '-'}<br/>
                    GSTIN: <span class="font-mono"><strong>${sup.gstin || 'Unregistered'}</strong></span>
                  </div>
                </div>

                <div class="invoice-party-box">
                  <div class="invoice-party-title">Billed & Delivered To (Consignee)</div>
                  <strong style="font-size: 14px; color: #0F172A;">${settings.companyName || 'Bharat Logistics'}</strong>
                  <div style="font-size: 12.5px; color: #475569; margin-top: 4px;">
                    ${settings.address || ''}<br/>
                    ${settings.city || ''}, ${settings.state || ''} - ${settings.pincode || ''}<br/>
                    Phone: ${settings.phone || '-'}<br/>
                    GSTIN: <span class="font-mono"><strong>${settings.gstin || '-'}</strong></span>
                  </div>
                </div>
              </div>

              <table class="table" style="margin-bottom: 24px; border: 1px solid #E2E8F0;">
                <thead>
                  <tr style="background-color: #F8FAFC;">
                    <th style="width: 40px;">#</th>
                    <th>Product & Description</th>
                    <th>SKU Code</th>
                    <th class="text-center">Quantity</th>
                    <th class="text-right">Rate (₹)</th>
                    <th class="text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  ${p.items.map((it, idx) => `
                    <tr>
                      <td class="font-mono text-muted">${idx + 1}</td>
                      <td style="font-weight: 600;">${it.productName}</td>
                      <td class="sku-code">${it.sku}</td>
                      <td class="text-center font-mono font-bold">${it.quantity}</td>
                      <td class="text-right font-mono">${formatINR(it.purchasePrice)}</td>
                      <td class="text-right font-mono font-bold">${formatINR(it.total)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="max-width: 400px; font-size: 12.5px; color: #64748B;">
                  <strong>Payment & Notes:</strong><br/>
                  Payment Method: ${p.paymentMethod || 'Bank Transfer'}<br/>
                  ${p.notes ? `Remarks: ${p.notes}<br/>` : ''}
                  Stock verified and credited into Smart Inventory Database.
                </div>

                <div style="width: 280px; background-color: #F8FAFC; padding: 14px; border-radius: 8px; border: 1px solid #E2E8F0;">
                  <div class="summary-row" style="color: #475569;">
                    <span>Subtotal:</span>
                    <span class="font-mono font-bold">${formatINR(p.subtotal)}</span>
                  </div>
                  <div class="summary-row" style="color: #475569;">
                    <span>GST Tax (${p.taxRate}%):</span>
                    <span class="font-mono">${formatINR(p.taxAmount)}</span>
                  </div>
                  ${p.discount > 0 ? `
                    <div class="summary-row" style="color: #475569;">
                      <span>Discount:</span>
                      <span class="font-mono text-success">- ${formatINR(p.discount)}</span>
                    </div>
                  ` : ''}
                  <div class="summary-row total-row" style="border-top: 2px solid #E2E8F0; margin-top: 8px; padding-top: 8px;">
                    <span>Net Payable:</span>
                    <span class="font-mono text-brand-purple" style="font-size: 16px;">${formatINR(p.grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer no-print">
            <button class="btn btn-outline" onclick="PurchasesModule.closeModal()">Close</button>
            <button class="btn btn-primary" onclick="window.print()">
              Print Inward Invoice
            </button>
          </div>
        </div>
      </div>
    `;
  }
};

window.PurchasesModule = PurchasesModule;
