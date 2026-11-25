/**
 * Smart Inventory Management System - Main Coordinator (App.js)
 * Manages client routing, sidebar active states, toast notifications,
 * theme preferences, global search, and settings CRUD.
 */

const App = {
  currentModule: 'dashboard',
  theme: 'light',

  getHashModule() {
    const raw = (window.location.hash || '').replace(/^#\/?/, '').split('?')[0].trim().toLowerCase();
    return raw || 'dashboard';
  },

  async init() {
    try {
      const user = await api.auth.getCurrentUser();
      if (!user) {
        window.location.href = 'login.html';
        return;
      }

      this.initTheme();
      this.bindEvents();
      await this.updateUserBadge();

      // Check URL hash or default to dashboard
      await this.navigateTo(this.getHashModule());
    } catch (err) {
      console.error('App initialization failed:', err);
      const container = document.getElementById('module-dashboard');
      if (container) {
        this.renderError(container, {
          title: 'Application Initialization Error',
          message: err?.message || 'Unable to initialize Smart Inventory workspace.',
          retryAction: 'App.init()'
        });
      }
    }
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
      avatarEls.forEach(el => el.innerText = user.avatar || (user.name || 'AD').slice(0, 2).toUpperCase());
    }
  },

  bindEvents() {
    window.addEventListener('hashchange', () => {
      this.navigateTo(this.getHashModule(), false);
    });

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
      await this.handleLogout();
      return;
    }

    const validModules = ['dashboard', 'products', 'categories', 'suppliers', 'purchases', 'sales', 'inventory', 'reports', 'settings'];
    const resolvedModule = validModules.includes(moduleId) ? moduleId : 'dashboard';

    this.currentModule = resolvedModule;
    if (updateHash) {
      window.location.hash = resolvedModule;
    }

    this.closeMobileSidebar();

    document.querySelectorAll('.nav-item').forEach(el => {
      if (el.getAttribute('data-module') === resolvedModule) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    document.querySelectorAll('.module-page').forEach(page => {
      page.classList.remove('active');
    });

    const targetPage = document.getElementById(`module-${resolvedModule}`);
    if (targetPage) {
      targetPage.classList.add('active');
    }

    const breadcrumbEl = document.getElementById('breadcrumb-current');
    if (breadcrumbEl) {
      const title = resolvedModule.charAt(0).toUpperCase() + resolvedModule.slice(1);
      breadcrumbEl.innerText = title;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      switch (resolvedModule) {
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
    } catch (err) {
      console.error(`Failed to render module '${resolvedModule}':`, err);
      if (targetPage) {
        this.renderError(targetPage, {
          title: `Unable to load ${resolvedModule.charAt(0).toUpperCase() + resolvedModule.slice(1)}`,
          message: err?.message || 'An unexpected rendering or network error occurred.',
          retryAction: `App.navigateTo('${resolvedModule}', false)`
        });
      }
    }
  },

  renderLoading(container, message = 'Loading workspace data...') {
    if (!container) return;
    container.innerHTML = `
      <div class="module-loading-state" role="status" aria-live="polite">
        <div class="loading-spinner-lg"></div>
        <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">${escapeHtml(message)}</div>
        <div style="font-size: 12.5px; color: var(--text-muted);">Fetching records and verifying inventory metrics...</div>
      </div>
    `;
  },

  renderError(container, { title = 'Failed to load data', message = 'Unable to connect to the server.', retryAction = 'App.navigateTo(App.currentModule, false)' } = {}) {
    if (!container) return;
    const isAuthIssue = /401|unauthorized|session expired|sign in/i.test(message);
    container.innerHTML = `
      <div class="module-error-card" role="alert">
        <div class="module-error-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
        <h2 style="font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">${escapeHtml(title)}</h2>
        <p style="font-size: 13.5px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 20px;">${escapeHtml(message)}</p>
        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
          <button type="button" class="btn btn-primary" onclick="${escapeHtml(retryAction)}">
            ↻ Retry Request
          </button>
          <button type="button" class="btn btn-outline" onclick="App.navigateTo('settings')">
            Open API Settings
          </button>
          ${isAuthIssue ? `<a href="login.html" class="btn btn-outline">Sign In Again</a>` : ''}
        </div>
      </div>
    `;
  },

  renderErrorBanner(message, retryAction = 'App.navigateTo(App.currentModule, false)') {
    if (!message) return '';
    return `
      <div class="module-error-banner" role="alert">
        <div>
          <strong>API Connection Warning:</strong> ${escapeHtml(message)}
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn btn-outline btn-sm" onclick="${escapeHtml(retryAction)}">↻ Retry</button>
          <button type="button" class="btn btn-outline btn-sm" onclick="App.navigateTo('settings')">API Settings</button>
        </div>
      </div>
    `;
  },

  /**
   * Reusable in-app confirmation modal (replaces native window.confirm blocked in iframes)
   */
  confirmAction({ title = 'Confirm Action', message = 'Are you sure?', confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false } = {}) {
    return new Promise((resolve) => {
      let root = document.getElementById('confirm-modal-root');
      if (!root) {
        root = document.createElement('div');
        root.id = 'confirm-modal-root';
        document.body.appendChild(root);
      }

      const cleanup = (result) => {
        root.innerHTML = '';
        resolve(result);
      };

      root.innerHTML = `
        <div class="modal-overlay active" id="app-confirm-modal" role="dialog" aria-modal="true">
          <div class="modal-container" style="max-width: 440px;">
            <div class="modal-header">
              <h3 class="modal-title">${escapeHtml(title)}</h3>
              <button type="button" class="btn btn-ghost btn-icon-only" id="confirm-close-btn">✕</button>
            </div>
            <div class="modal-body">
              <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.6;">${escapeHtml(message)}</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" id="confirm-cancel-btn">${escapeHtml(cancelLabel)}</button>
              <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-ok-btn">${escapeHtml(confirmLabel)}</button>
            </div>
          </div>
        </div>
      `;

      document.getElementById('confirm-close-btn').onclick = () => cleanup(false);
      document.getElementById('confirm-cancel-btn').onclick = () => cleanup(false);
      document.getElementById('confirm-ok-btn').onclick = () => cleanup(true);
    });
  },

  async handleLogout() {
    const confirmed = await this.confirmAction({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out from Smart Inventory System?',
      confirmLabel: 'Sign Out',
      danger: true
    });
    if (confirmed) {
      await api.auth.logout();
      window.location.href = 'login.html';
    }
  },

  async handleGlobalSearch(query) {
    if (!query || !query.trim()) return;
    ProductsModule.currentFilter.search = query.trim();
    await this.navigateTo('products');
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
      <div class="toast-message">${escapeHtml(message)}</div>
      <button type="button" class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 250);
    }, 4000);
  },

  // Settings Module Implementation
  async renderSettings() {
    const container = document.getElementById('module-settings');
    if (!container) return;

    this.renderLoading(container, 'Loading system settings...');

    try {
      const res = await api.settings.get();
      if (!res || !res.success) {
        this.renderError(container, {
          title: 'Failed to load Settings',
          message: res?.error || 'Could not retrieve system settings.',
          retryAction: 'App.renderSettings()'
        });
        return;
      }
      const settings = res.data || {};
      const isLocalHost = Boolean(window.APP_CONFIG?.isLocalHost);
      const apiPlaceholder = isLocalHost ? 'http://localhost:5000/api' : 'https://your-api-domain.com/api';
      const buildApiHint = window.APP_CONFIG?.buildApiBaseUrl
        ? `Build default detected from VITE_API_BASE_URL: ${window.APP_CONFIG.buildApiBaseUrl}`
        : (isLocalHost ? 'Local dev fallback: http://localhost:5000/api' : 'Set your hosted ASP.NET Core Web API URL (e.g. https://your-api.onrender.com/api).');

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
              <input type="text" name="companyName" class="form-control" required value="${escapeHtml(settings.companyName || '')}" />
            </div>

            <div class="form-group">
              <label class="form-label required">Trade / Brand Name</label>
              <input type="text" name="tradeName" class="form-control" required value="${escapeHtml(settings.tradeName || '')}" />
            </div>

            <div class="form-row" style="display: flex; gap: 14px;">
              <div class="form-group" style="flex: 1;">
                <label class="form-label required">GSTIN</label>
                <input type="text" name="gstin" class="form-control font-mono" maxlength="15" required value="${escapeHtml(settings.gstin || '')}" />
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label required">Phone Contact</label>
                <input type="tel" name="phone" class="form-control font-mono" required value="${escapeHtml(settings.phone || '')}" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label required">Official Email</label>
              <input type="email" name="email" class="form-control" required value="${escapeHtml(settings.email || '')}" />
            </div>

            <div class="form-group">
              <label class="form-label required">Registered Office Address</label>
              <textarea name="address" class="form-control" rows="2" required>${escapeHtml(settings.address || '')}</textarea>
            </div>

            <div class="form-row" style="display: flex; gap: 12px;">
              <div class="form-group" style="flex: 1;">
                <label class="form-label required">City</label>
                <input type="text" name="city" class="form-control" required value="${escapeHtml(settings.city || '')}" />
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label required">State</label>
                <input type="text" name="state" class="form-control" required value="${escapeHtml(settings.state || '')}" />
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label required">PIN Code</label>
                <input type="text" name="pincode" class="form-control font-mono" required value="${escapeHtml(settings.pincode || '')}" />
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
                  <input type="text" name="currencySymbol" class="form-control font-mono" required value="${escapeHtml(settings.currencySymbol || '₹')}" readonly />
                  <div class="input-helper">Locked to Indian Rupee (₹) as per specifications</div>
                </div>
                <div class="form-group" style="flex: 1;">
                  <label class="form-label required">Default GST Rate (%)</label>
                  <input type="number" min="0" max="28" name="defaultTaxRate" class="form-control font-mono" required value="${Number(settings.defaultTaxRate ?? 18)}" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label required">Default Low-Stock Threshold</label>
                <input type="number" min="1" max="100" name="lowStockThreshold" class="form-control font-mono" required value="${Number(settings.lowStockThreshold ?? 10)}" />
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
                  <label class="form-label">ASP.NET Core Web API Base URL</label>
                  <input type="url" id="api-base-url-input" class="form-control font-mono" value="${escapeHtml(API_CONFIG.baseUrl || '')}" placeholder="${escapeHtml(apiPlaceholder)}" />
                  <div class="input-helper">${escapeHtml(buildApiHint)}</div>
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
    } catch (err) {
      console.error('Failed to render settings:', err);
      this.renderError(container, {
        title: 'Failed to load Settings',
        message: err?.message || 'Unexpected error rendering system settings.',
        retryAction: 'App.renderSettings()'
      });
    }
  },

  async saveBusinessSettings(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    const payload = {
      companyName: formData.get('companyName').trim(),
      tradeName: formData.get('tradeName').trim(),
      gstin: formData.get('gstin').trim().toUpperCase(),
      phone: formData.get('phone').trim(),
      email: formData.get('email').trim(),
      address: formData.get('address').trim(),
      city: formData.get('city').trim(),
      state: formData.get('state').trim(),
      pincode: formData.get('pincode').trim()
    };

    await api.settings.update(payload);
    this.showToast('Business details updated successfully!', 'success');
  },

  async savePreferenceSettings(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    const parsedTax = parseFloat(formData.get('defaultTaxRate'));
    const parsedThreshold = parseInt(formData.get('lowStockThreshold'), 10);

    const payload = {
      defaultTaxRate: Number.isNaN(parsedTax) ? 18 : Math.min(28, Math.max(0, parsedTax)),
      lowStockThreshold: Number.isNaN(parsedThreshold) ? 10 : Math.max(1, parsedThreshold),
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
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

    const customUrl = urlInput.value.trim().replace(/\/$/, '');
    btn.disabled = true;
    btn.innerHTML = `<span class="loading-spinner" style="width: 14px; height: 14px; border-width: 2px;"></span> Connecting...`;
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `<div style="font-size: 12.5px; color: var(--text-muted);">Attempting ping to ${escapeHtml(customUrl)}/health ...</div>`;

    const originalUrl = API_CONFIG.baseUrl;
    API_CONFIG.baseUrl = customUrl;
    const res = await apiRequest('/health');
    API_CONFIG.baseUrl = originalUrl;

    btn.disabled = false;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg> Test Connection`;

    if (res.success) {
      resultDiv.innerHTML = `
        <div style="padding: 10px 14px; background: var(--color-success-bg); color: var(--color-success-text); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 6px; font-size: 12.5px;">
          <strong>✓ Connection Established!</strong> ASP.NET Core Web API is live at <code>${escapeHtml(customUrl)}</code>. MongoDB Atlas database is online.
        </div>
      `;
      this.showToast('Successfully connected to ASP.NET Core API!', 'success');
    } else {
      resultDiv.innerHTML = `
        <div style="padding: 10px 14px; background: var(--color-warning-bg); color: var(--color-warning-text); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 6px; font-size: 12.5px; line-height: 1.5;">
          <strong>○ API Server in Standby:</strong> Could not connect to <code>${escapeHtml(customUrl)}</code> (${escapeHtml(res.error || 'offline')}).<br/>
          Run <code>dotnet run</code> inside <code>InventoryManagementSystem.Api/</code> or check CORS/firewall. System safely running with local storage data.
        </div>
      `;
    }
  },

  async resetDataToDefaults() {
    const confirmed = await this.confirmAction({
      title: 'Reset to Seed Data',
      message: 'Reset all inventory, sales, purchases, and products to initial seed data? This will overwrite recent modifications.',
      confirmLabel: 'Reset Data',
      danger: true
    });
    if (confirmed) {
      StorageService.resetToDefaults();
      this.showToast('System data reset to initial default Indian business data!', 'success');
      await this.navigateTo('dashboard');
    }
  }
};

window.App = App;

// Bootstrap when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
