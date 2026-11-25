/**
 * Smart Inventory Management System - Inventory Module
 * Handles current stock overview, low-stock/out-of-stock alerts,
 * physical stock adjustment with reason logs, and complete audit trail.
 */

const InventoryModule = {
  activeTab: 'all', // 'all', 'low', 'out', 'transactions'

  async init() {
    await this.render();
  },

  async render() {
    const container = document.getElementById('module-inventory');
    if (!container) return;

    App.renderLoading(container, 'Loading warehouse stock audit...');

    try {
      const [productsRes, txRes] = await Promise.all([
        api.products.getAll(),
        api.inventory.getTransactions()
      ]);

      if (!productsRes || productsRes.success === false) {
        App.renderError(container, {
          title: 'Failed to Load Inventory',
          message: productsRes?.error || 'Could not retrieve inventory stock from the API.',
          retryAction: 'InventoryModule.render()'
        });
        return;
      }

      const allProducts = productsRes.data || [];
      const transactions = (txRes?.data || []).sort((a, b) => (new Date(b.timestamp || 0).getTime() || 0) - (new Date(a.timestamp || 0).getTime() || 0));

      this.products = allProducts;

      const lowStockCount = allProducts.filter(p => p.status === 'low_stock').length;
      const outOfStockCount = allProducts.filter(p => p.status === 'out_of_stock').length;

      let displayedProducts = allProducts;
      if (this.activeTab === 'low') {
        displayedProducts = allProducts.filter(p => p.status === 'low_stock');
      } else if (this.activeTab === 'out') {
        displayedProducts = allProducts.filter(p => p.status === 'out_of_stock');
      }

      container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Warehouse Stock Control & Audit</h1>
          <p class="page-subtitle">Track available inventory, audit stock movements, adjust counts with reason codes, and log transactions.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-secondary" onclick="InventoryModule.openAdjustmentModal()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            Adjust Stock
          </button>
          <button type="button" class="btn btn-primary" onclick="PurchasesModule.openNewPurchaseModal()">
            + Inward Procurement
          </button>
        </div>
      </div>

      <!-- Segmented Navigation Filter Tabs -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div class="segmented-tabs">
          <button type="button" class="segmented-tab ${this.activeTab === 'all' ? 'active' : ''}" onclick="InventoryModule.switchTab('all')">
            All Inventory (${allProducts.length})
          </button>
          <button type="button" class="segmented-tab ${this.activeTab === 'low' ? 'active' : ''}" onclick="InventoryModule.switchTab('low')">
            Low Stock Alert (${lowStockCount})
          </button>
          <button type="button" class="segmented-tab ${this.activeTab === 'out' ? 'active' : ''}" onclick="InventoryModule.switchTab('out')">
            Out of Stock (${outOfStockCount})
          </button>
          <button type="button" class="segmented-tab ${this.activeTab === 'transactions' ? 'active' : ''}" onclick="InventoryModule.switchTab('transactions')">
            Movement Log (${transactions.length})
          </button>
        </div>

        <div style="font-size: 13px; color: var(--text-muted);">
          Total items tracked: <strong class="font-mono text-primary">${allProducts.length}</strong>
        </div>
      </div>

      ${this.activeTab === 'transactions' ? this.renderTransactionsView(transactions) : this.renderStockTableView(displayedProducts)}

      <div id="inventory-modal-root"></div>
    `;
    } catch (err) {
      console.error('Inventory render error:', err);
      App.renderError(container, {
        title: 'Inventory Page Error',
        message: err?.message || 'Unexpected error rendering warehouse stock control.',
        retryAction: 'InventoryModule.render()'
      });
    }
  },

  switchTab(tab) {
    this.activeTab = tab;
    this.render();
  },

  renderStockTableView(products) {
    return `
      <div class="data-card">
        <div class="data-card-header">
          <h2 class="card-title">Live Inventory Status</h2>
          <span style="font-size: 13px; color: var(--text-muted);">Reorder threshold monitored continuously</span>
        </div>

        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Product & SKU</th>
                <th>Category</th>
                <th class="text-right">Unit Cost</th>
                <th class="text-center">Available Stock</th>
                <th class="text-center">Min Threshold</th>
                <th class="text-right">Asset Valuation</th>
                <th class="text-center">Status</th>
                <th class="text-right">Adjustment</th>
              </tr>
            </thead>
            <tbody>
              ${products.length === 0 ? `
                <tr>
                  <td colspan="8">
                    <div class="empty-state">
                      <h3 class="empty-state-title">No items found for this view</h3>
                      <p class="empty-state-desc">All items may be in healthy stock condition.</p>
                    </div>
                  </td>
                </tr>
              ` : products.map(p => {
                const valuation = (p.stockQuantity || 0) * (p.purchasePrice || 0);
                return `
                  <tr>
                    <td>
                      <div class="product-item-cell">
                        <div class="product-img-box">
                          <img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.name)}" onerror="this.src='https://placehold.co/100x100?text=Item'" />
                        </div>
                        <div>
                          <div class="product-cell-name">${escapeHtml(p.name)}</div>
                          <div class="product-cell-sku sku-code">${escapeHtml(p.sku)} · ${escapeHtml(p.unit)}</div>
                        </div>
                      </div>
                    </td>
                    <td>${escapeHtml(p.categoryName || '-')}</td>
                    <td class="text-right font-mono text-muted">${formatINR(p.purchasePrice)}</td>
                    <td class="text-center font-mono font-bold" style="font-size: 15px; color: ${p.stockQuantity === 0 ? 'var(--color-danger)' : p.stockQuantity <= p.minStockLevel ? 'var(--color-warning)' : 'var(--text-primary)'}">
                      ${p.stockQuantity} ${escapeHtml(p.unit)}
                    </td>
                    <td class="text-center font-mono text-muted">${p.minStockLevel}</td>
                    <td class="text-right font-mono font-bold">${formatINR(valuation)}</td>
                    <td class="text-center">
                      ${ProductsModule.renderStatusBadge(p.status)}
                    </td>
                    <td class="text-right">
                      <div class="table-actions">
                        <button type="button" class="btn btn-outline btn-sm" onclick="InventoryModule.openAdjustmentModal('${escapeHtml(p._id)}')" title="Adjust quantity">
                          Adjust
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderTransactionsView(transactions) {
    return `
      <div class="data-card">
        <div class="data-card-header">
          <div>
            <h2 class="card-title">Stock Transaction Audit Trail</h2>
            <div style="font-size: 12px; color: var(--text-muted);">Immutable record of all inward, outward, and manual stock movements</div>
          </div>
          <span class="badge badge-purple">${transactions.length} Recorded Events</span>
        </div>

        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Type</th>
                <th>Product & SKU</th>
                <th class="text-center">Qty Changed</th>
                <th class="text-center">Stock Before → After</th>
                <th>Reference / Reason</th>
                <th>Audit Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.length === 0 ? `
                <tr><td colspan="7" class="text-center" style="padding: 24px; color: var(--text-muted)">No inventory movements recorded yet.</td></tr>
              ` : transactions.map(tx => {
                let badgeClass = 'badge-info';
                let sign = '+';
                if (tx.type === 'SALE' || tx.type === 'ADJUSTMENT_SUBTRACT') {
                  badgeClass = 'badge-danger';
                  sign = '';
                } else if (tx.type === 'PURCHASE') {
                  badgeClass = 'badge-success';
                }

                return `
                  <tr>
                    <td class="font-mono text-muted" style="font-size: 12px;">${formatDateTime(tx.timestamp)}</td>
                    <td>
                      <span class="badge ${badgeClass}">${escapeHtml(tx.type)}</span>
                    </td>
                    <td>
                      <div style="font-weight: 600;">${escapeHtml(tx.productName)}</div>
                      <div class="sku-code">${escapeHtml(tx.sku)}</div>
                    </td>
                    <td class="text-center font-mono font-bold" style="color: ${tx.quantity < 0 ? 'var(--color-danger)' : 'var(--color-success)'}">
                      ${sign}${tx.quantity}
                    </td>
                    <td class="text-center font-mono">
                      <span style="color: var(--text-muted);">${tx.previousStock}</span> → <strong>${tx.newStock}</strong>
                    </td>
                    <td>
                      <strong class="font-mono" style="font-size: 12px;">${escapeHtml(tx.referenceId)}</strong>
                    </td>
                    <td style="font-size: 12.5px; color: var(--text-secondary); max-width: 250px;">
                      ${escapeHtml(tx.notes || '-')}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  openAdjustmentModal(preselectedProductId = null) {
    const products = this.products || [];
    if (products.length === 0) {
      App.showToast("No products available to adjust", "warning");
      return;
    }

    const defaultProd = preselectedProductId
      ? products.find(p => p._id === preselectedProductId) || products[0]
      : products[0];

    const modalRoot = document.getElementById('inventory-modal-root');
    modalRoot.innerHTML = `
      <div class="modal-overlay active" id="inventory-modal">
        <div class="modal-container">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">Manual Stock Adjustment</h3>
              <div style="font-size: 12px; color: var(--text-muted);">Record damage, loss, return, or physical warehouse audit correction</div>
            </div>
            <button type="button" class="btn btn-ghost btn-icon-only" onclick="InventoryModule.closeModal()">✕</button>
          </div>
          <form onsubmit="InventoryModule.saveAdjustment(event)">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label required">Select Product</label>
                <select name="productId" class="form-control" id="adjust-prod-select" onchange="InventoryModule.updateStockPreview(this.value)">
                  ${products.map(p => `
                    <option value="${escapeHtml(p._id)}" data-stock="${p.stockQuantity}" ${p._id === defaultProd._id ? 'selected' : ''}>
                      ${escapeHtml(p.name)} (Current: ${p.stockQuantity} ${escapeHtml(p.unit)})
                    </option>
                  `).join('')}
                </select>
              </div>

              <div class="form-row" style="display: flex; gap: 16px;">
                <div class="form-group" style="flex: 1;">
                  <label class="form-label required">Adjustment Type</label>
                  <select name="adjustmentType" class="form-control" id="adjust-type-select" onchange="InventoryModule.recalculatePreview()">
                    <option value="add">Add Stock (+ Inward)</option>
                    <option value="subtract">Subtract Stock (- Outward / Loss)</option>
                    <option value="set">Physical Count Audit (Set Absolute Value)</option>
                  </select>
                </div>
                <div class="form-group" style="flex: 1;">
                  <label class="form-label required">Quantity</label>
                  <input type="number" min="1" name="quantity" id="adjust-qty-input" class="form-control font-mono" required value="1" oninput="InventoryModule.recalculatePreview()" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label required">Reason for Adjustment</label>
                <select name="reason" class="form-control" required>
                  <option value="Physical Stock Audit Discrepancy">Physical Stock Audit Discrepancy</option>
                  <option value="Damaged Goods / Transit Breakage">Damaged Goods / Transit Breakage</option>
                  <option value="Supplier Return (Defective)">Supplier Return (Defective)</option>
                  <option value="Customer Return Restock">Customer Return Restock</option>
                  <option value="Internal Demonstration / Testing">Internal Demonstration / Testing</option>
                  <option value="Expired / Shelf-life End">Expired / Shelf-life End</option>
                  <option value="Promotional Sample Dispatch">Promotional Sample Dispatch</option>
                </select>
              </div>

              <!-- Live Preview of Resulting Stock -->
              <div style="background-color: var(--bg-surface-subtle); padding: 12px 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <span style="font-size: 13px; color: var(--text-secondary);">Projected New Inventory:</span>
                <span class="font-mono font-bold" id="adjust-result-preview" style="font-size: 16px; color: var(--color-primary);">
                  ${defaultProd.stockQuantity} units
                </span>
              </div>

              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">Audit Notes & Inspection Sign-off</label>
                <textarea name="notes" class="form-control" rows="2" placeholder="e.g. Audit verified by inventory manager, batch box cracked..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" onclick="InventoryModule.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Apply Stock Adjustment</button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.recalculatePreview();
  },

  updateStockPreview(productId) {
    this.recalculatePreview();
  },

  recalculatePreview() {
    const prodSelect = document.getElementById('adjust-prod-select');
    const typeSelect = document.getElementById('adjust-type-select');
    const qtyInput = document.getElementById('adjust-qty-input');
    const previewEl = document.getElementById('adjust-result-preview');

    if (!prodSelect || !typeSelect || !qtyInput || !previewEl) return;

    const selectedOption = prodSelect.options[prodSelect.selectedIndex];
    const currentStock = parseInt(selectedOption.getAttribute('data-stock'), 10) || 0;
    const type = typeSelect.value;
    qtyInput.min = type === 'set' ? '0' : '1';
    const parsedQty = parseInt(qtyInput.value, 10);
    const qty = Number.isFinite(parsedQty) ? parsedQty : 0;

    let newStock = currentStock;
    if (type === 'add') {
      newStock = currentStock + qty;
    } else if (type === 'subtract') {
      newStock = currentStock - qty;
    } else if (type === 'set') {
      newStock = qty;
    }

    if (newStock < 0) {
      previewEl.innerText = `${newStock} (INVALID: Negative Stock!)`;
      previewEl.style.color = 'var(--color-danger)';
    } else {
      previewEl.innerText = `${newStock} units`;
      previewEl.style.color = 'var(--color-primary)';
    }
  },

  closeModal() {
    const modal = document.getElementById('inventory-modal');
    if (modal) modal.remove();
  },

  async saveAdjustment(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');

    const productId = formData.get('productId');
    const adjustmentType = formData.get('adjustmentType');
    const quantity = parseInt(formData.get('quantity'), 10);
    const reason = (formData.get('reason') || '').trim();
    const notes = (formData.get('notes') || '').trim();

    if (!Number.isFinite(quantity) || (adjustmentType === 'set' ? quantity < 0 : quantity <= 0)) {
      App.showToast(adjustmentType === 'set' ? 'Physical stock count must be 0 or greater.' : 'Adjustment quantity must be greater than zero.', 'warning');
      return;
    }

    if (!reason) {
      App.showToast('Please select a reason for the stock adjustment.', 'warning');
      return;
    }

    const targetProd = (this.products || []).find(p => p._id === productId);
    if (targetProd && adjustmentType === 'subtract' && targetProd.stockQuantity - quantity < 0) {
      App.showToast('Adjustment would result in negative stock, which is not permitted.', 'error');
      return;
    }

    const origText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Applying...';
    }

    try {
      const res = await api.inventory.adjustStock(productId, adjustmentType, quantity, reason, notes);
      if (res.success) {
        App.showToast("Stock adjusted and audit transaction logged successfully!", "success");
        this.closeModal();
        await this.render();
        DashboardModule.render();
        ProductsModule.render();
      } else {
        App.showToast(res.error || "Failed to adjust stock", "error");
      }
    } finally {
      if (submitBtn && document.body.contains(submitBtn)) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;
      }
    }
  }
};

window.InventoryModule = InventoryModule;
