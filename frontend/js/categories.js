/**
 * Smart Inventory Management System - Categories Module
 * Handles category listing, product counts calculation, add/edit/delete,
 * and strictly prevents deletion if products are assigned to the category.
 */

const CategoriesModule = {
  async init() {
    await this.render();
  },

  async render() {
    const container = document.getElementById('module-categories');
    if (!container) return;

    const res = await api.categories.getAll();
    const categories = res.data || [];

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Category Management</h1>
          <p class="page-subtitle">Organize and group items into taxonomy categories with live product count tracking.</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="CategoriesModule.openModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            + Add New Category
          </button>
        </div>
      </div>

      <!-- Categories Grid Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; margin-bottom: 24px;">
        ${categories.map(c => `
          <div class="data-card" style="margin-bottom: 0; padding: 20px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div class="metric-icon-box metric-icon-purple" style="width: 36px; height: 36px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                  </div>
                  <div>
                    <h3 style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 2px;">${c.name}</h3>
                    <span class="sku-code">${c.code || 'CAT'}</span>
                  </div>
                </div>
                <div class="table-actions">
                  <button class="action-btn" title="Edit Category" onclick="CategoriesModule.openModal('${c._id}')">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </button>
                  <button class="action-btn delete-btn" title="Delete Category" onclick="CategoriesModule.confirmDelete('${c._id}', '${c.name.replace(/'/g, "\\'")}', ${c.productCount})">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
              <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 16px;">
                ${c.description || 'No description provided.'}
              </p>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 14px; border-top: 1px solid var(--border-color); font-size: 12.5px;">
              <span class="text-muted">Assigned Products</span>
              <span class="font-mono font-bold" style="background: var(--bg-surface-subtle); padding: 3px 10px; border-radius: 4px;">
                ${c.productCount} ${c.productCount === 1 ? 'Product' : 'Products'}
              </span>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Categories Table View -->
      <div class="data-card">
        <div class="data-card-header">
          <h2 class="card-title">All Categories Summary</h2>
          <span style="font-size: 13px; color: var(--text-muted);">${categories.length} total categories registered</span>
        </div>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Code</th>
                <th>Description</th>
                <th class="text-center">Assigned Products</th>
                <th class="text-center">Deletion Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${categories.map(c => `
                <tr>
                  <td style="font-weight: 600;">${c.name}</td>
                  <td class="sku-code">${c.code || '-'}</td>
                  <td style="color: var(--text-secondary); max-width: 320px;">${c.description || '-'}</td>
                  <td class="text-center font-mono font-bold">${c.productCount}</td>
                  <td class="text-center">
                    ${c.productCount > 0 ? `
                      <span class="badge badge-warning" title="Contains active products; cannot delete">Protected (${c.productCount})</span>
                    ` : `
                      <span class="badge badge-success">Safe to Delete</span>
                    `}
                  </td>
                  <td class="text-right">
                    <div class="table-actions">
                      <button class="action-btn" title="Edit" onclick="CategoriesModule.openModal('${c._id}')">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </button>
                      <button class="action-btn delete-btn" title="Delete" onclick="CategoriesModule.confirmDelete('${c._id}', '${c.name.replace(/'/g, "\\'")}', ${c.productCount})">
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

      <div id="category-modal-root"></div>
    `;
  },

  async openModal(categoryId = null) {
    let category = {
      name: '',
      code: '',
      description: ''
    };

    const isEdit = !!categoryId;
    if (isEdit) {
      const all = (await api.categories.getAll()).data || [];
      const found = all.find(c => c._id === categoryId);
      if (found) category = found;
    }

    const modalRoot = document.getElementById('category-modal-root');
    modalRoot.innerHTML = `
      <div class="modal-overlay active" id="category-modal">
        <div class="modal-container">
          <div class="modal-header">
            <h3 class="modal-title">${isEdit ? 'Edit Category' : 'Create Category'}</h3>
            <button class="btn btn-ghost btn-icon-only" onclick="CategoriesModule.closeModal()">✕</button>
          </div>
          <form onsubmit="CategoriesModule.saveCategory(event, '${categoryId || ''}')">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label required">Category Name</label>
                <input type="text" name="name" class="form-control" required value="${category.name}" placeholder="e.g. Industrial Automation & Cables" />
              </div>

              <div class="form-group">
                <label class="form-label required">Short Code</label>
                <input type="text" name="code" class="form-control sku-code" required value="${category.code}" placeholder="e.g. IND-AUTO" />
                <div class="input-helper">Prefix used for SKU generation and warehouse shelf labels</div>
              </div>

              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">Category Description</label>
                <textarea name="description" class="form-control" rows="3" placeholder="Describe the types of inventory items belonging to this category...">${category.description || ''}</textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" onclick="CategoriesModule.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Category'}</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  closeModal() {
    const modal = document.getElementById('category-modal');
    if (modal) modal.remove();
  },

  async saveCategory(e, categoryId) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    const payload = {
      name: formData.get('name').trim(),
      code: formData.get('code').trim().toUpperCase(),
      description: formData.get('description').trim()
    };

    let result;
    if (categoryId) {
      result = await api.categories.update(categoryId, payload);
    } else {
      result = await api.categories.create(payload);
    }

    if (result.success) {
      App.showToast(categoryId ? 'Category updated successfully!' : 'New category created successfully!', 'success');
      this.closeModal();
      await this.render();
      DashboardModule.render();
      ProductsModule.render();
    } else {
      App.showToast(result.error || 'Failed to save category', 'error');
    }
  },

  async confirmDelete(categoryId, categoryName, productCount) {
    // Check if products assigned
    if (productCount > 0) {
      App.showToast(`Cannot delete '${categoryName}' because ${productCount} product(s) are assigned to it. Reassign or delete those products first.`, 'error');
      return;
    }

    if (confirm(`Are you sure you want to delete category '${categoryName}'?`)) {
      const res = await api.categories.delete(categoryId);
      if (res.success) {
        App.showToast('Category deleted successfully', 'success');
        await this.render();
        DashboardModule.render();
      } else {
        App.showToast(res.error || 'Failed to delete category', 'error');
      }
    }
  }
};

window.CategoriesModule = CategoriesModule;
