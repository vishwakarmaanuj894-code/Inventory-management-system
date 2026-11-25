/**
 * Smart Inventory Management System - Suppliers Module
 * Handles vendor directory, GSTIN details, purchase history modal, and supplier CRUD.
 */

const SuppliersModule = {
  suppliersList: [],

  async init() {
    await this.render();
  },

  async render() {
    const container = document.getElementById('module-suppliers');
    if (!container) return;

    App.renderLoading(container, 'Loading supplier directory...');

    try {
      const res = await api.suppliers.getAll();
      if (!res || res.success === false) {
        App.renderError(container, {
          title: 'Failed to Load Suppliers',
          message: res?.error || 'Could not retrieve suppliers from the API.',
          retryAction: 'SuppliersModule.render()'
        });
        return;
      }

      const suppliers = res.data || [];
      this.suppliersList = suppliers;

      container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Supplier & Vendor Directory</h1>
          <p class="page-subtitle">Manage manufacturers, wholesale distributors, GST numbers, contact persons, and purchase records.</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="SuppliersModule.openModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            + Add New Supplier
          </button>
        </div>
      </div>

      <div class="data-card">
        <div class="data-card-header">
          <h2 class="card-title">Registered Suppliers</h2>
          <span style="font-size: 13px; color: var(--text-muted);">${suppliers.length} active suppliers</span>
        </div>

        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Company & Contact Person</th>
                <th>GSTIN</th>
                <th>Phone & Email</th>
                <th>City & Address</th>
                <th class="text-center">Orders</th>
                <th class="text-right">Total Purchased</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${suppliers.length === 0 ? `
                <tr>
                  <td colspan="7">
                    <div class="empty-state">
                      <h3 class="empty-state-title">No suppliers found</h3>
                      <p class="empty-state-desc">Click "+ Add New Supplier" to create your vendor ledger.</p>
                    </div>
                  </td>
                </tr>
              ` : suppliers.map(s => `
                <tr>
                  <td>
                    <div style="font-weight: 700; color: var(--text-primary);">${escapeHtml(s.company)}</div>
                    <div style="font-size: 12px; color: var(--text-muted);">${escapeHtml(s.name)} (Contact)</div>
                  </td>
                  <td>
                    <span class="font-mono sku-code" style="color: var(--color-primary); font-weight: 600;">${escapeHtml(s.gstin || 'Unregistered')}</span>
                  </td>
                  <td>
                    <div class="font-mono" style="font-size: 12.5px;">${escapeHtml(s.phone)}</div>
                    <div style="font-size: 12px; color: var(--text-muted);">${escapeHtml(s.email)}</div>
                  </td>
                  <td>
                    <div style="font-size: 13px;">${escapeHtml(s.city)}, ${escapeHtml(s.state)}</div>
                    <div style="font-size: 11.5px; color: var(--text-muted); max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(s.address)}">
                      ${escapeHtml(s.address)}
                    </div>
                  </td>
                  <td class="text-center">
                    <button class="btn btn-outline btn-sm font-mono" onclick="SuppliersModule.viewPurchaseHistory('${escapeHtml(s._id)}')" title="View order history">
                      ${s.purchaseOrdersCount || 0} Invoices
                    </button>
                  </td>
                  <td class="text-right font-mono font-bold">
                    ${formatINR(s.totalPurchasedAmount || 0)}
                  </td>
                  <td class="text-right">
                    <div class="table-actions">
                      <button class="action-btn" title="Purchase History" onclick="SuppliersModule.viewPurchaseHistory('${escapeHtml(s._id)}')">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                      </button>
                      <button class="action-btn" title="Edit Supplier" onclick="SuppliersModule.openModal('${escapeHtml(s._id)}')">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </button>
                      <button class="action-btn delete-btn" title="Delete Supplier" onclick="SuppliersModule.confirmDelete('${escapeHtml(s._id)}')">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div id="supplier-modal-root"></div>
    `;
    } catch (err) {
      console.error('Suppliers render error:', err);
      App.renderError(container, {
        title: 'Suppliers Page Error',
        message: err?.message || 'Unexpected error rendering supplier directory.',
        retryAction: 'SuppliersModule.render()'
      });
    }
  },

  async openModal(supplierId = null) {
    let supplier = {
      name: '',
      company: '',
      phone: '',
      email: '',
      gstin: '',
      address: '',
      city: '',
      state: 'Karnataka'
    };

    const isEdit = !!supplierId;
    if (isEdit) {
      const res = await api.suppliers.getById(supplierId);
      if (res.success && res.data) {
        supplier = res.data;
      } else {
        App.showToast(res.error || 'Supplier not found', 'error');
        return;
      }
    }

    const modalRoot = document.getElementById('supplier-modal-root');
    modalRoot.innerHTML = `
      <div class="modal-overlay active" id="supplier-modal">
        <div class="modal-container modal-lg">
          <div class="modal-header">
            <h3 class="modal-title">${isEdit ? 'Edit Supplier Details' : 'Add New Supplier'}</h3>
            <button type="button" class="btn btn-ghost btn-icon-only" onclick="SuppliersModule.closeModal()">✕</button>
          </div>
          <form onsubmit="SuppliersModule.saveSupplier(event, '${escapeHtml(supplierId || '')}')">
            <div class="modal-body">
              <div class="form-row" style="display: flex; gap: 16px;">
                <div class="form-group" style="flex: 1;">
                  <label class="form-label required">Company / Business Name</label>
                  <input type="text" name="company" class="form-control" required value="${escapeHtml(supplier.company)}" placeholder="e.g. Apex Electro-Tech Distributors" />
                </div>
                <div class="form-group" style="flex: 1;">
                  <label class="form-label required">Contact Person Name</label>
                  <input type="text" name="name" class="form-control" required value="${escapeHtml(supplier.name)}" placeholder="e.g. Suresh Menon" />
                </div>
              </div>

              <div class="form-row" style="display: flex; gap: 16px;">
                <div class="form-group" style="flex: 1;">
                  <label class="form-label">GSTIN (15-digit)</label>
                  <input type="text" name="gstin" class="form-control font-mono" maxlength="15" value="${escapeHtml(supplier.gstin || '')}" placeholder="29AABCA5678D1Z2" />
                  <div class="input-helper">Indian Goods and Services Tax Identification Number</div>
                </div>
                <div class="form-group" style="flex: 1;">
                  <label class="form-label required">Phone Number</label>
                  <input type="tel" name="phone" class="form-control font-mono" required value="${escapeHtml(supplier.phone)}" placeholder="+91 98450 11223" />
                </div>
              </div>

              <div class="form-row" style="display: flex; gap: 16px;">
                <div class="form-group" style="flex: 1;">
                  <label class="form-label required">Email Address</label>
                  <input type="email" name="email" class="form-control" required value="${escapeHtml(supplier.email)}" placeholder="orders@supplier.com" />
                </div>
                <div class="form-group" style="flex: 1;">
                  <label class="form-label required">City</label>
                  <input type="text" name="city" class="form-control" required value="${escapeHtml(supplier.city)}" placeholder="e.g. Bengaluru, Delhi, Mumbai" />
                </div>
                <div class="form-group" style="flex: 1;">
                  <label class="form-label required">State</label>
                  <input type="text" name="state" class="form-control" required value="${escapeHtml(supplier.state)}" placeholder="e.g. Karnataka" />
                </div>
              </div>

              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label required">Physical Office / Warehouse Address</label>
                <textarea name="address" class="form-control" rows="2" required placeholder="Plot number, industrial area, street, landmark...">${escapeHtml(supplier.address || '')}</textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" onclick="SuppliersModule.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Supplier'}</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  closeModal() {
    const modal = document.getElementById('supplier-modal');
    if (modal) modal.remove();
  },

  async saveSupplier(e, supplierId) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');

    const payload = {
      company: (formData.get('company') || '').trim(),
      name: (formData.get('name') || '').trim(),
      phone: (formData.get('phone') || '').trim(),
      email: (formData.get('email') || '').trim(),
      gstin: (formData.get('gstin') || '').trim().toUpperCase(),
      address: (formData.get('address') || '').trim(),
      city: (formData.get('city') || '').trim(),
      state: (formData.get('state') || '').trim()
    };

    if (!payload.company || !payload.name || !payload.phone || !payload.email) {
      App.showToast('Company, contact name, phone, and email are required.', 'warning');
      return;
    }

    const origText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
    }

    try {
      const result = supplierId
        ? await api.suppliers.update(supplierId, payload)
        : await api.suppliers.create(payload);

      if (result.success) {
        App.showToast(supplierId ? 'Supplier updated successfully!' : 'Supplier added successfully!', 'success');
        this.closeModal();
        await this.render();
        DashboardModule.render();
        ProductsModule.render();
      } else {
        App.showToast(result.error || 'Failed to save supplier', 'error');
      }
    } finally {
      if (submitBtn && document.body.contains(submitBtn)) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;
      }
    }
  },

  async viewPurchaseHistory(supplierId) {
    const supplier = this.suppliersList.find(s => s._id === supplierId);
    const supplierCompany = supplier ? supplier.company : 'Supplier';
    const res = await api.suppliers.getPurchases(supplierId);
    const purchases = res.data || [];

    const totalSpent = purchases.reduce((sum, p) => sum + (p.grandTotal || 0), 0);

    const modalRoot = document.getElementById('supplier-modal-root');
    modalRoot.innerHTML = `
      <div class="modal-overlay active" id="supplier-modal">
        <div class="modal-container modal-lg">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">Purchase History: ${escapeHtml(supplierCompany)}</h3>
              <div style="font-size: 12px; color: var(--text-muted);">${purchases.length} invoices · Lifetime procurement: ${formatINR(totalSpent)}</div>
            </div>
            <button type="button" class="btn btn-ghost btn-icon-only" onclick="SuppliersModule.closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th class="text-center">Items</th>
                    <th>Payment Mode</th>
                    <th class="text-right">Grand Total</th>
                    <th class="text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  ${purchases.length === 0 ? `
                    <tr><td colspan="6" class="text-center" style="padding: 24px; color: var(--text-muted)">No purchase invoices recorded for this supplier yet.</td></tr>
                  ` : purchases.map(p => `
                    <tr>
                      <td class="font-mono font-bold">${escapeHtml(p.invoiceNumber)}</td>
                      <td class="font-mono text-muted" style="font-size: 12px;">${formatDate(p.createdAt)}</td>
                      <td class="text-center font-mono">${(p.items || []).length}</td>
                      <td>${escapeHtml(p.paymentMethod || 'NEFT/RTGS')}</td>
                      <td class="text-right font-mono font-bold">${formatINR(p.grandTotal)}</td>
                      <td class="text-right">
                        <button type="button" class="btn btn-outline btn-sm" onclick="SuppliersModule.closeModal(); App.navigateTo('purchases').then(() => PurchasesModule.viewInvoice('${escapeHtml(p._id)}'));">
                          View
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" onclick="SuppliersModule.closeModal()">Close</button>
            <button type="button" class="btn btn-secondary" onclick="SuppliersModule.closeModal(); App.navigateTo('purchases').then(() => PurchasesModule.openNewPurchaseModal());">
              + New Purchase Invoice
            </button>
          </div>
        </div>
      </div>
    `;
  },

  async confirmDelete(supplierId) {
    const supplier = this.suppliersList.find(s => s._id === supplierId);
    const supplierCompany = supplier ? supplier.company : 'this supplier';
    const confirmed = await App.confirmAction({
      title: 'Delete Supplier',
      message: `Are you sure you want to delete supplier '${supplierCompany}'?`,
      confirmLabel: 'Delete Supplier',
      danger: true
    });
    if (confirmed) {
      const res = await api.suppliers.delete(supplierId);
      if (res.success) {
        App.showToast('Supplier deleted successfully', 'success');
        await this.render();
        DashboardModule.render();
      } else {
        App.showToast(res.error || 'Failed to delete supplier', 'error');
      }
    }
  }
};

window.SuppliersModule = SuppliersModule;
