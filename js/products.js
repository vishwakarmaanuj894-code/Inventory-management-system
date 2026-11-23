/**
 * Smart Inventory Management System - Products Module
 * Handles product listing, dynamic filtering, search, add/edit/delete/view modals.
 */

const ProductsModule = {
  currentFilter: {
    search: '',
    categoryId: 'all',
    status: 'all'
  },

  async init() {
    await this.render();
  },

  async render() {
    const container = document.getElementById('module-products');
    if (!container) return;

    const [productsRes, categoriesRes, suppliersRes] = await Promise.all([
      api.products.getAll(this.currentFilter),
      api.categories.getAll(),
      api.suppliers.getAll()
    ]);

    const products = productsRes.data || [];
    const categories = categoriesRes.data || [];
    const suppliers = suppliersRes.data || [];

    // Store references for modals
    this.categories = categories;
    this.suppliers = suppliers;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Product Catalog</h1>
          <p class="page-subtitle">Manage inventory SKUs, categories, pricing, suppliers, and safety stock levels.</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="ProductsModule.openModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            + Add New Product
          </button>
        </div>
      </div>

      <div class="data-card">
        <div class="data-card-header">
          <div class="table-filter-bar">
            <!-- Search Input -->
            <div class="search-input-wrapper">
              <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" id="product-search-input" placeholder="Search by name, SKU..." value="${this.currentFilter.search}" oninput="ProductsModule.handleSearch(this.value)">
            </div>

            <!-- Category Filter -->
            <select class="filter-select" onchange="ProductsModule.handleCategoryFilter(this.value)">
              <option value="all">All Categories</option>
              ${categories.map(c => `<option value="${c._id}" ${this.currentFilter.categoryId === c._id ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>

            <!-- Stock Status Filter -->
            <select class="filter-select" onchange="ProductsModule.handleStatusFilter(this.value)">
              <option value="all">All Stock Status</option>
              <option value="in_stock" ${this.currentFilter.status === 'in_stock' ? 'selected' : ''}>In Stock</option>
              <option value="low_stock" ${this.currentFilter.status === 'low_stock' ? 'selected' : ''}>Low Stock</option>
              <option value="out_of_stock" ${this.currentFilter.status === 'out_of_stock' ? 'selected' : ''}>Out of Stock</option>
            </select>
          </div>

          <div style="font-size: 13px; color: var(--text-muted);">
            Showing <strong class="text-primary font-mono">${products.length}</strong> products
          </div>
        </div>

        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Product & SKU</th>
                <th>Category</th>
                <th>Supplier</th>
                <th class="text-right">Cost (₹)</th>
                <th class="text-right">Price (₹)</th>
                <th class="text-center">Stock Level</th>
                <th class="text-center">Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${products.length === 0 ? `
                <tr>
                  <td colspan="8">
                    <div class="empty-state">
                      <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                      <h3 class="empty-state-title">No products found</h3>
                      <p class="empty-state-desc">Try clearing your filters or click "+ Add New Product" to populate your catalog.</p>
                      <button class="btn btn-primary btn-sm" onclick="ProductsModule.openModal()">+ Add First Product</button>
                    </div>
                  </td>
                </tr>
              ` : products.map(p => `
                <tr>
                  <td>
                    <div class="product-item-cell">
                      <div class="product-img-box">
                        <img src="${p.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=150&auto=format&fit=crop&q=80'}" alt="${p.name}" onerror="this.src='https://placehold.co/100x100?text=Item'" />
                      </div>
                      <div>
                        <div class="product-cell-name" title="${p.name}">${p.name}</div>
                        <div class="product-cell-sku sku-code">${p.sku} · ${p.unit || 'pcs'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style="font-size: 13px; color: var(--text-secondary);">${p.categoryName || '-'}</span>
                  </td>
                  <td>
                    <span style="font-size: 13px; color: var(--text-secondary);">${p.supplierName || '-'}</span>
                  </td>
                  <td class="text-right font-mono text-muted">${formatINR(p.purchasePrice)}</td>
                  <td class="text-right font-mono font-bold">${formatINR(p.sellingPrice)}</td>
                  <td class="text-center">
                    <span class="font-mono font-bold" style="font-size: 14px;">${p.stockQuantity}</span>
                    <span style="font-size: 11px; color: var(--text-muted); display: block;">Min: ${p.minStockLevel}</span>
                  </td>
                  <td class="text-center">
                    ${this.renderStatusBadge(p.status)}
                  </td>
                  <td class="text-right">
                    <div class="table-actions">
                      <button class="action-btn" title="View Details" onclick="ProductsModule.viewDetails('${p._id}')">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      </button>
                      <button class="action-btn" title="Edit Product" onclick="ProductsModule.openModal('${p._id}')">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </button>
                      <button class="action-btn delete-btn" title="Delete Product" onclick="ProductsModule.confirmDelete('${p._id}', '${p.name.replace(/'/g, "\\'")}')">
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

      <!-- Add/Edit Modal Container -->
      <div id="product-modal-root"></div>
    `;
  },

  renderStatusBadge(status) {
    if (status === 'in_stock') {
      return `<span class="badge badge-success">● In Stock</span>`;
    } else if (status === 'low_stock') {
      return `<span class="badge badge-warning">▲ Low Stock</span>`;
    } else {
      return `<span class="badge badge-danger">✕ Out of Stock</span>`;
    }
  },

  handleSearch(val) {
    this.currentFilter.search = val;
    this.render();
  },

  handleCategoryFilter(val) {
    this.currentFilter.categoryId = val;
    this.render();
  },

  handleStatusFilter(val) {
    this.currentFilter.status = val;
    this.render();
  },

  async openModal(productId = null) {
    let product = {
      name: '',
      sku: '',
      description: '',
      categoryId: this.categories[0] ? this.categories[0]._id : '',
      supplierId: this.suppliers[0] ? this.suppliers[0]._id : '',
      purchasePrice: '',
      sellingPrice: '',
      stockQuantity: 10,
      minStockLevel: 5,
      unit: 'pcs',
      imageUrl: ''
    };

    const isEdit = !!productId;
    if (isEdit) {
      const res = await api.products.getById(productId);
      if (res.success) {
        product = res.data;
      }
    }

    const modalRoot = document.getElementById('product-modal-root');
    modalRoot.innerHTML = `
      <div class="modal-overlay active" id="product-modal">
        <div class="modal-container modal-lg">
          <div class="modal-header">
            <h3 class="modal-title">${isEdit ? 'Edit Product' : 'Add New Product'}</h3>
            <button class="btn btn-ghost btn-icon-only" onclick="ProductsModule.closeModal()">✕</button>
          </div>
          <form id="product-form" onsubmit="ProductsModule.saveProduct(event, '${productId || ''}')">
            <div class="modal-body">
              <div class="form-row" style="display: flex; gap: 16px;">
                <div class="form-group" style="flex: 2;">
                  <label class="form-label required">Product Name</label>
                  <input type="text" name="name" class="form-control" required value="${product.name}" placeholder="e.g. Havells 4-Way Extension Cord" />
                </div>
                <div class="form-group" style="flex: 1;">
                  <label class="form-label required">SKU Code</label>
                  <input type="text" name="sku" class="form-control sku-code" required value="${product.sku}" placeholder="e.g. HOME-HAVE-001" ${isEdit ? 'readonly' : ''} />
                  <div class="input-helper">${isEdit ? 'SKU identifier cannot be modified' : 'Must be unique code'}</div>
                </div>
              </div>

              <div class="form-row" style="display: flex; gap: 16px;">
                <div class="form-group" style="flex: 1;">
                  <label class="form-label required">Category</label>
                  <select name="categoryId" class="form-control" required>
                    ${this.categories.map(c => `<option value="${c._id}" ${product.categoryId === c._id ? 'selected' : ''}>${c.name}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group" style="flex: 1;">
                  <label class="form-label required">Supplier / Vendor</label>
                  <select name="supplierId" class="form-control" required>
                    ${this.suppliers.map(s => `<option value="${s._id}" ${product.supplierId === s._id ? 'selected' : ''}>${s.company} (${s.city})</option>`).join('')}
                  </select>
                </div>
              </div>

              <div class="form-row" style="display: flex; gap: 16px;">
                <div class="form-group" style="flex: 1;">
                  <label class="form-label required">Purchase Cost Price (₹)</label>
                  <input type="number" step="any" min="0" name="purchasePrice" class="form-control font-mono" required value="${product.purchasePrice}" placeholder="0.00" />
                </div>
                <div class="form-group" style="flex: 1;">
                  <label class="form-label required">Selling Price (₹)</label>
                  <input type="number" step="any" min="0" name="sellingPrice" class="form-control font-mono" required value="${product.sellingPrice}" placeholder="0.00" />
                </div>
                <div class="form-group" style="flex: 1;">
                  <label class="form-label required">Stock Unit</label>
                  <select name="unit" class="form-control">
                    <option value="pcs" ${product.unit === 'pcs' ? 'selected' : ''}>Pieces (pcs)</option>
                    <option value="pack" ${product.unit === 'pack' ? 'selected' : ''}>Pack</option>
                    <option value="box" ${product.unit === 'box' ? 'selected' : ''}>Box</option>
                    <option value="kg" ${product.unit === 'kg' ? 'selected' : ''}>Kilogram (kg)</option>
                    <option value="jar" ${product.unit === 'jar' ? 'selected' : ''}>Jar</option>
                  </select>
                </div>
              </div>

              <div class="form-row" style="display: flex; gap: 16px;">
                <div class="form-group" style="flex: 1;">
                  <label class="form-label required">Initial / Current Stock</label>
                  <input type="number" min="0" name="stockQuantity" class="form-control font-mono" required value="${product.stockQuantity}" placeholder="0" />
                </div>
                <div class="form-group" style="flex: 1;">
                  <label class="form-label required">Minimum Alert Level</label>
                  <input type="number" min="1" name="minStockLevel" class="form-control font-mono" required value="${product.minStockLevel}" placeholder="5" />
                  <div class="input-helper">Triggers low-stock alert when stock falls below this</div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Product Image URL</label>
                <input type="url" name="imageUrl" class="form-control" value="${product.imageUrl || ''}" placeholder="https://example.com/product-image.jpg" />
                <div class="input-helper">Paste an image link or leave empty to use category stock image</div>
              </div>

              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">Description & Specifications</label>
                <textarea name="description" class="form-control" rows="2" placeholder="Item dimensions, warranty, voltage, specifications...">${product.description || ''}</textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" onclick="ProductsModule.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Product'}</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  closeModal() {
    const modal = document.getElementById('product-modal');
    if (modal) modal.remove();
  },

  async saveProduct(e, productId) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    const categoryId = formData.get('categoryId');
    const supplierId = formData.get('supplierId');

    const selectedCategory = this.categories.find(c => c._id === categoryId);
    const selectedSupplier = this.suppliers.find(s => s._id === supplierId);

    const payload = {
      name: formData.get('name').trim(),
      sku: formData.get('sku').trim(),
      description: formData.get('description').trim(),
      categoryId: categoryId,
      categoryName: selectedCategory ? selectedCategory.name : '',
      supplierId: supplierId,
      supplierName: selectedSupplier ? (selectedSupplier.company || selectedSupplier.name) : '',
      purchasePrice: parseFloat(formData.get('purchasePrice')) || 0,
      sellingPrice: parseFloat(formData.get('sellingPrice')) || 0,
      stockQuantity: parseInt(formData.get('stockQuantity'), 10) || 0,
      minStockLevel: parseInt(formData.get('minStockLevel'), 10) || 5,
      unit: formData.get('unit'),
      imageUrl: formData.get('imageUrl') || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=150&auto=format&fit=crop&q=80'
    };

    if (payload.sellingPrice < payload.purchasePrice) {
      if (!confirm("Selling price is lower than purchase price. Do you still want to proceed?")) {
        return;
      }
    }

    let result;
    if (productId) {
      result = await api.products.update(productId, payload);
    } else {
      result = await api.products.create(payload);
    }

    if (result.success) {
      App.showToast(productId ? 'Product updated successfully!' : 'New product created successfully!', 'success');
      this.closeModal();
      await this.render();
      DashboardModule.render();
    } else {
      App.showToast(result.error || 'Failed to save product', 'error');
    }
  },

  async viewDetails(productId) {
    const res = await api.products.getById(productId);
    if (!res.success) {
      App.showToast("Product not found", "error");
      return;
    }
    const p = res.data;

    const modalRoot = document.getElementById('product-modal-root');
    modalRoot.innerHTML = `
      <div class="modal-overlay active" id="product-modal">
        <div class="modal-container">
          <div class="modal-header">
            <h3 class="modal-title">Product Details</h3>
            <button class="btn btn-ghost btn-icon-only" onclick="ProductsModule.closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <div style="display: flex; gap: 20px; margin-bottom: 20px;">
              <div style="width: 100px; height: 100px; border-radius: var(--radius-md); border: 1px solid var(--border-color); overflow: hidden; flex-shrink: 0;">
                <img src="${p.imageUrl}" alt="${p.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://placehold.co/100x100?text=Item'" />
              </div>
              <div>
                <h4 style="font-size: 16px; font-weight: 700; margin-bottom: 4px;">${p.name}</h4>
                <div class="sku-code" style="margin-bottom: 8px;">SKU: ${p.sku}</div>
                <div>${this.renderStatusBadge(p.status)}</div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: var(--bg-surface-subtle); padding: 14px; border-radius: var(--radius-md); margin-bottom: 16px;">
              <div>
                <span style="font-size: 11.5px; color: var(--text-muted); display: block;">Category</span>
                <strong>${p.categoryName || '-'}</strong>
              </div>
              <div>
                <span style="font-size: 11.5px; color: var(--text-muted); display: block;">Supplier</span>
                <strong>${p.supplierName || '-'}</strong>
              </div>
              <div>
                <span style="font-size: 11.5px; color: var(--text-muted); display: block;">Cost Price</span>
                <strong class="font-mono">${formatINR(p.purchasePrice)}</strong>
              </div>
              <div>
                <span style="font-size: 11.5px; color: var(--text-muted); display: block;">Selling Price</span>
                <strong class="font-mono text-brand-purple">${formatINR(p.sellingPrice)}</strong>
              </div>
              <div>
                <span style="font-size: 11.5px; color: var(--text-muted); display: block;">Current Inventory</span>
                <strong class="font-mono">${p.stockQuantity} ${p.unit}</strong>
              </div>
              <div>
                <span style="font-size: 11.5px; color: var(--text-muted); display: block;">Reorder Threshold</span>
                <strong class="font-mono">${p.minStockLevel} ${p.unit}</strong>
              </div>
            </div>

            <div>
              <span style="font-size: 11.5px; color: var(--text-muted); display: block; margin-bottom: 4px;">Description</span>
              <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.6;">${p.description || 'No description provided for this product.'}</p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="ProductsModule.closeModal()">Close</button>
            <button class="btn btn-primary" onclick="ProductsModule.openModal('${p._id}')">Edit Product</button>
          </div>
        </div>
      </div>
    `;
  },

  async confirmDelete(productId, productName) {
    if (confirm(`Are you sure you want to permanently delete '${productName}' from inventory? This action cannot be undone.`)) {
      const res = await api.products.delete(productId);
      if (res.success) {
        App.showToast(`Product deleted successfully`, 'success');
        await this.render();
        DashboardModule.render();
      } else {
        App.showToast(res.error || 'Failed to delete product', 'error');
      }
    }
  }
};

window.ProductsModule = ProductsModule;
