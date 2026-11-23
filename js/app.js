/**
 * Smart Inventory Management System - Main Coordinator (App.js)
 * Manages client routing, sidebar active states, toast notifications,
 * theme preferences, global search, and settings CRUD.
 */

const App = {
  currentModule: 'dashboard',
  theme: 'light',

  async init() {
    this.initTheme();
    this.bindEvents();
    this.updateUserBadge();

    // Check URL hash or default to dashboard
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    this.navigateTo(hash);
  },

  initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
    this.setTheme(savedTheme);
  },

  setTheme(theme) {
    this.theme = theme;
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    document.documentElement.setAttribute('data-theme', theme);

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
      themeToggleBtn.innerHTML = theme === 'dark'
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    }
  },

  toggleTheme() {
    this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
    this.showToast(`Theme changed to ${this.theme} mode`, 'info');
  },

  async updateUserBadge() {
    const user = await api.auth.getCurrentUser();
    if (user) {
      const nameEls = document.querySelectorAll('.user-name-display');
      const roleEls = document.querySelectorAll('.user-role-display');
      const avatarEls = document.querySelectorAll('.user-avatar-display');

      nameEls.forEach(el => el.innerText = user.name || 'Admin');
      roleEls.forEach(el => el.innerText = user.role || 'Administrator');
      avatarEls.forEach(el => el.innerText = user.avatar || user.name.slice(0, 2).toUpperCase());
    }
  },

  bindEvents() {
    // Window hashchange routing
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '') || 'dashboard';
      this.navigateTo(hash, false);
    });

    // Mobile sidebar backdrop close
    const backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => {
        this.closeMobileSidebar();
      });
    }
  },

  toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar && backdrop) {
      sidebar.classList.toggle('show');
      backdrop.classList.toggle('show');
    }
  },

  closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar && backdrop) {
      sidebar.classList.remove('show');
      backdrop.classList.remove('show');
    }
  },

  async navigateTo(moduleId, updateHash = true) {
    if (moduleId === 'logout') {
      this.handleLogout();
      return;
    }

    this.currentModule = moduleId;
    if (updateHash) {
      window.location.hash = moduleId;
    }

    this.closeMobileSidebar();

    // Update active nav link
    document.querySelectorAll('.nav-item').forEach(el => {
      if (el.getAttribute('data-module') === moduleId) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Update active page container
    document.querySelectorAll('.module-page').forEach(page => {
      page.classList.remove('active');
    });

    const targetPage = document.getElementById(`module-${moduleId}`);
    if (targetPage) {
      targetPage.classList.add('active');
    }

    // Update Topbar Breadcrumb
    const breadcrumbEl = document.getElementById('breadcrumb-current');
    if (breadcrumbEl) {
      const title = moduleId.charAt(0).toUpperCase() + moduleId.slice(1);
      breadcrumbEl.innerText = title;
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Initialize/Render the module
    switch (moduleId) {
      case 'dashboard':
        await DashboardModule.init();
        break;
      case 'products':
        await ProductsModule.init();
        break;
      case 'categories':
        await CategoriesModule.init();
        break;
      case 'suppliers':
        await SuppliersModule.init();
        break;
      case 'purchases':
        await PurchasesModule.init();
        break;
      case 'sales':
        await SalesModule.init();
        break;
      case 'inventory':
        await InventoryModule.init();
        break;
      case 'reports':
        await ReportsModule.init();
        break;
      case 'settings':
        await this.renderSettings();
        break;
      default:
        await DashboardModule.init();
    }
  },

  async handleLogout() {
    if (confirm("Are you sure you want to sign out from Smart Inventory System?")) {
      await api.auth.logout();
      window.location.href = 'login.html';
    }
  },

  handleGlobalSearch(query) {
    if (!query) return;
    // Route to products with search query
    this.navigateTo('products');
    ProductsModule.currentFilter.search = query;
    ProductsModule.render();
  },

  // Toast Notification System
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else if (type === 'warning') {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    } else {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `
      ${iconSvg}
      <div class="toast-message">${message}</div>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);

    // Trigger enter animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 250);
    }, 4000);
  },

  // Settings Module Implementation
  async renderSettings() {
    const container = document.getElementById('module-settings');
    if (!container) return;

    const res = await api.settings.get();
    const settings = res.data || {};
    const user = (await api.auth.getCurrentUser()) || {};

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Enterprise System Settings</h1>
          <p class="page-subtitle">Configure legal business tax identity, administrative profile, inventory thresholds, and backup.</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 24px;">
        <!-- Business Information Card -->
        <div class="data-card">
          <div class="data-card-header">
            <h2 class="card-title">Business & GST Identity</h2>
          </div>
          <form onsubmit="App.saveBusinessSettings(event)" style="padding: 20px;">
            <div class="form-group">
              <label class="form-label required">Company Legal Name</label>
              <input type="text" name="companyName" class="form-control" required value="${settings.companyName || ''}" />
            </div>

            <div class="form-group">
              <label class="form-label required">Trade / Brand Name</label>
              <input type="text" name="tradeName" class="form-control" required value="${settings.tradeName || ''}" />
            </div>

            <div class="form-row" style="display: flex; gap: 14px;">
              <div class="form-group" style="flex: 1;">
                <label class="form-label required">GSTIN</label>
                <input type="text" name="gstin" class="form-control font-mono" maxlength="15" required value="${settings.gstin || ''}" />
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label required">Phone Contact</label>
                <input type="tel" name="phone" class="form-control font-mono" required value="${settings.phone || ''}" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label required">Official Email</label>
              <input type="email" name="email" class="form-control" required value="${settings.email || ''}" />
            </div>

            <div class="form-group">
              <label class="form-label required">Registered Office Address</label>
              <textarea name="address" class="form-control" rows="2" required>${settings.address || ''}</textarea>
            </div>

            <div class="form-row" style="display: flex; gap: 12px;">
              <div class="form-group" style="flex: 1;">
                <label class="form-label required">City</label>
                <input type="text" name="city" class="form-control" required value="${settings.city || ''}" />
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label required">State</label>
                <input type="text" name="state" class="form-control" required value="${settings.state || ''}" />
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label required">PIN Code</label>
                <input type="text" name="pincode" class="form-control font-mono" required value="${settings.pincode || ''}" />
              </div>
            </div>

            <button type="submit" class="btn btn-primary" style="margin-top: 10px;">Save Business Details</button>
          </form>
        </div>

        <!-- System Defaults & Thresholds -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          <div class="data-card">
            <div class="data-card-header">
              <h2 class="card-title">Thresholds & Currency Preferences</h2>
            </div>
            <form onsubmit="App.savePreferenceSettings(event)" style="padding: 20px;">
              <div class="form-row" style="display: flex; gap: 14px;">
                <div class="form-group" style="flex: 1;">
                  <label class="form-label required">Currency Symbol</label>
                  <input type="text" name="currencySymbol" class="form-control font-mono" required value="${settings.currencySymbol || '₹'}" readonly />
                  <div class="input-helper">Locked to Indian Rupee (₹) as per specifications</div>
                </div>
                <div class="form-group" style="flex: 1;">
                  <label class="form-label required">Default GST Rate (%)</label>
                  <input type="number" min="0" max="28" name="defaultTaxRate" class="form-control font-mono" required value="${settings.defaultTaxRate || 18}" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label required">Default Low-Stock Threshold</label>
                <input type="number" min="1" max="100" name="lowStockThreshold" class="form-control font-mono" required value="${settings.lowStockThreshold || 10}" />
                <div class="input-helper">Items below this quantity will flag low-stock warnings across the system</div>
              </div>

              <div class="form-group">
                <label class="form-label">Theme Mode</label>
                <select name="theme" class="form-control" onchange="App.setTheme(this.value)">
                  <option value="light" ${this.theme === 'light' ? 'selected' : ''}>Light Theme (White & Light-Gray)</option>
                  <option value="dark" ${this.theme === 'dark' ? 'selected' : ''}>Dark Theme (Slate Deep Contrast)</option>
                </select>
              </div>

              <button type="submit" class="btn btn-primary" style="margin-top: 10px;">Update Preferences</button>
            </form>
          </div>

          <!-- ASP.NET Core Web API & MongoDB Atlas Integration Card -->
          <div class="data-card">
            <div class="data-card-header">
              <div>
                <h2 class="card-title">ASP.NET Core Web API & MongoDB Atlas</h2>
                <div style="font-size: 12px; color: var(--text-muted);">Phase 2 Backend Integration Gateway</div>
              </div>
              <span id="backend-status-badge" class="badge ${API_CONFIG.useBackendApi ? 'badge-success' : 'badge-warning'}">
                ${API_CONFIG.useBackendApi ? '● Backend Mode: ACTIVE' : '○ Standby / Local Mode'}
              </span>
            </div>
            <div style="padding: 20px;">
              <form onsubmit="App.saveApiSettings(event)">
                <div class="form-group">
                  <label class="form-label required">ASP.NET Core Web API Base URL</label>
                  <input type="url" id="api-base-url-input" class="form-control font-mono" required value="${API_CONFIG.baseUrl}" placeholder="http://localhost:5000/api" />
                  <div class="input-helper">Host URL where InventoryManagementSystem.Api is listening (e.g. http://localhost:5000/api or https://localhost:7001/api)</div>
                </div>

                <div class="form-group">
                  <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="api-backend-toggle" ${API_CONFIG.useBackendApi ? 'checked' : ''} />
                    <span style="font-weight: 600; font-size: 13px;">Enable Live Fetch to ASP.NET Core Web API</span>
                  </label>
                  <div class="input-helper">When enabled, all CRUD calls, JWT auth, and stock updates go directly to C# Controllers & MongoDB Atlas.</div>
                </div>

                <div style="display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap;">
                  <button type="submit" class="btn btn-primary btn-sm">Save Gateway Config</button>
                  <button type="button" class="btn btn-outline btn-sm" id="test-connection-btn" onclick="App.testBackendConnection()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                    Test Connection
                  </button>
                </div>
              </form>

              <div id="connection-test-result" style="margin-top: 12px; display: none;"></div>
            </div>
          </div>

          <!-- Data Backup & Reset Center -->
          <div class="data-card">
            <div class="data-card-header">
              <h2 class="card-title">Data Storage & Backup</h2>
            </div>
            <div style="padding: 20px;">
              <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;">
                Local demo database contains all products, categories, suppliers, sales orders, and audit transactions.
              </p>
              <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="btn btn-outline btn-sm" onclick="App.exportFullBackup()">
                  Export Full JSON Backup
                </button>
                <button class="btn btn-danger btn-sm" onclick="App.resetDataToDefaults()">
                  Reset to Seed Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async saveBusinessSettings(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    const payload = {
      companyName: formData.get('companyName'),
      tradeName: formData.get('tradeName'),
      gstin: formData.get('gstin').toUpperCase(),
      phone: formData.get('phone'),
      email: formData.get('email'),
      address: formData.get('address'),
      city: formData.get('city'),
      state: formData.get('state'),
      pincode: formData.get('pincode')
    };

    await api.settings.update(payload);
    this.showToast('Business details updated successfully!', 'success');
  },

  async savePreferenceSettings(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    const payload = {
      defaultTaxRate: parseFloat(formData.get('defaultTaxRate')) || 18,
      lowStockThreshold: parseInt(formData.get('lowStockThreshold'), 10) || 10,
      theme: formData.get('theme')
    };

    await api.settings.update(payload);
    this.showToast('System preferences saved successfully!', 'success');
  },

  exportFullBackup() {
    const jsonStr = StorageService.exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `smart_inventory_backup_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    this.showToast('Full database JSON exported!', 'success');
  },

  saveApiSettings(e) {
    e.preventDefault();
    const urlInput = document.getElementById('api-base-url-input');
    const toggle = document.getElementById('api-backend-toggle');

    const newUrl = urlInput.value.trim().replace(/\/$/, '');
    const enabled = toggle.checked;

    api.setBackendMode(enabled, newUrl);
    this.showToast(`Backend configuration saved: ${enabled ? 'Live API Enabled' : 'Standby Mode'}`, 'success');

    const badge = document.getElementById('backend-status-badge');
    if (badge) {
      badge.className = `badge ${enabled ? 'badge-success' : 'badge-warning'}`;
      badge.innerText = enabled ? '● Backend Mode: ACTIVE' : '○ Standby / Local Mode';
    }
  },

  async testBackendConnection() {
    const btn = document.getElementById('test-connection-btn');
    const resultDiv = document.getElementById('connection-test-result');
    const urlInput = document.getElementById('api-base-url-input');

    if (!btn || !resultDiv) return;

    btn.disabled = true;
    btn.innerHTML = `<span class="loading-spinner" style="width: 14px; height: 14px; border-width: 2px;"></span> Connecting...`;
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `<div style="font-size: 12.5px; color: var(--text-muted);">Attempting ping to ${urlInput.value}/dashboard/summary ...</div>`;

    const customUrl = urlInput.value.trim().replace(/\/$/, '');
    const originalUrl = API_CONFIG.baseUrl;
    API_CONFIG.baseUrl = customUrl;

    const res = await apiRequest('/dashboard/summary');
    API_CONFIG.baseUrl = originalUrl;

    btn.disabled = false;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg> Test Connection`;

    if (res.success && res.data) {
      resultDiv.innerHTML = `
        <div style="padding: 10px 14px; background: var(--color-success-bg); color: var(--color-success-text); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 6px; font-size: 12.5px;">
          <strong>✓ Connection Established!</strong> ASP.NET Core Web API is live at <code>${customUrl}</code>. MongoDB Atlas database is online.
        </div>
      `;
      this.showToast('Successfully connected to ASP.NET Core API!', 'success');
    } else {
      resultDiv.innerHTML = `
        <div style="padding: 10px 14px; background: var(--color-warning-bg); color: var(--color-warning-text); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 6px; font-size: 12.5px; line-height: 1.5;">
          <strong>○ API Server in Standby:</strong> Could not connect to <code>${customUrl}</code>.<br/>
          Run <code>dotnet run</code> inside <code>InventoryManagementSystem.Api/</code> or check CORS/firewall. System safely running with local storage data.
        </div>
      `;
    }
  },

  resetDataToDefaults() {
    if (confirm("Reset all inventory, sales, purchases, and products to initial seed data? This will overwrite recent modifications.")) {
      StorageService.resetToDefaults();
      this.showToast('System data reset to initial default Indian business data!', 'success');
      this.navigateTo('dashboard');
    }
  }
};

window.App = App;

// Bootstrap when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
