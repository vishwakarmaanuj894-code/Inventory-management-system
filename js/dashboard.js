/**
 * Smart Inventory Management System - Dashboard Module
 * Handles dashboard KPI cards, dynamic SVG analytics charts,
 * recent transactions, low stock alerts, and top-selling products.
 */

const DashboardModule = {
  async init() {
    await this.render();
  },

  async render() {
    const container = document.getElementById('module-dashboard');
    if (!container) return;

    App.renderLoading(container, 'Loading executive dashboard...');

    try {
      // Fetch required data from API
      const [productsRes, categoriesRes, suppliersRes, salesRes, purchasesRes, reportRes, overviewRes] = await Promise.all([
        api.products.getAll(),
        api.categories.getAll(),
        api.suppliers.getAll(),
        api.sales.getAll(),
        api.purchases.getAll(),
        api.reports.getSummary('all'),
        api.dashboard.getSalesOverview()
      ]);

      const coreResponses = [productsRes, categoriesRes, suppliersRes, salesRes, purchasesRes, reportRes];
      const failedResponses = coreResponses.filter(r => r && r.success === false);

      if (failedResponses.length === coreResponses.length) {
        App.renderError(container, {
          title: 'Dashboard Data Unavailable',
          message: failedResponses[0]?.error || 'Unable to fetch dashboard data from the backend API.',
          retryAction: 'DashboardModule.render()'
        });
        return;
      }

      const partialErrorBanner = failedResponses.length > 0
        ? App.renderErrorBanner(failedResponses[0]?.error || 'Some dashboard metrics could not be loaded.', 'DashboardModule.render()')
        : '';

      const products = Array.isArray(productsRes?.data) ? productsRes.data : [];
      const categories = Array.isArray(categoriesRes?.data) ? categoriesRes.data : [];
      const suppliers = Array.isArray(suppliersRes?.data) ? suppliersRes.data : [];
      const sales = Array.isArray(salesRes?.data) ? salesRes.data : [];
      const purchases = Array.isArray(purchasesRes?.data) ? purchasesRes.data : [];
      const summary = (reportRes && reportRes.data) ? reportRes.data : {};
      const monthlyOverview = (overviewRes && Array.isArray(overviewRes.data)) ? overviewRes.data : null;

      const totalStock = products.reduce((acc, p) => acc + (Number(p.stockQuantity) || 0), 0);
      const lowStockCount = products.filter(p => p.status === 'low_stock' || p.status === 'out_of_stock').length;

      // Build Recent Transactions (combined sales + purchases, sorted by date desc)
      const combinedTx = [
        ...sales.map(s => ({
          type: 'SALE',
          id: s._id,
          invoiceNumber: s.invoiceNumber || '-',
          party: s.customerName || 'Customer',
          amount: Number(s.grandTotal) || 0,
          date: s.createdAt,
          status: s.status || 'Completed'
        })),
        ...purchases.map(p => ({
          type: 'PURCHASE',
          id: p._id,
          invoiceNumber: p.invoiceNumber || '-',
          party: p.supplierName || 'Supplier',
          amount: Number(p.grandTotal) || 0,
          date: p.createdAt,
          status: p.status || 'Completed'
        }))
      ].sort((a, b) => (new Date(b.date || 0).getTime() || 0) - (new Date(a.date || 0).getTime() || 0)).slice(0, 5);

      // Top Selling Products
      const topProducts = (summary.productBreakdown || []).slice(0, 5);

      // Low Stock Alert Products
      const lowStockProducts = products
        .filter(p => (Number(p.stockQuantity) || 0) <= (Number(p.minStockLevel) || 0))
        .slice(0, 5);

      container.innerHTML = `
        ${partialErrorBanner}
        <div class="page-header">
          <div>
            <h1 class="page-title">Executive Inventory Dashboard</h1>
            <p class="page-subtitle">Real-time overview of your warehouse stock, revenue, sales, and supply chain operations.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-outline btn-sm" onclick="App.navigateTo('reports')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              View Reports
            </button>
            <button class="btn btn-secondary btn-sm" onclick="PurchasesModule.openNewPurchaseModal()">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
              + New Purchase
            </button>
            <button class="btn btn-primary btn-sm" onclick="SalesModule.openNewSaleModal()">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              + Create Sale
            </button>
          </div>
        </div>

      <!-- KPI Metrics Cards Row 1 -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-card-header">
            <span class="metric-label">Total Revenue</span>
            <div class="metric-icon-box metric-icon-purple">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
          </div>
          <div class="metric-value num-metric">${formatINR(summary.totalSalesRevenue || 0)}</div>
          <div class="metric-footer">
            <span class="font-mono">${sales.length}</span>
            <span>Sales invoices billed</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-card-header">
            <span class="metric-label">Estimated Profit</span>
            <div class="metric-icon-box metric-icon-green">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            </div>
          </div>
          <div class="metric-value num-metric">${formatINR(summary.estimatedProfit || 0)}</div>
          <div class="metric-footer">
            <span class="metric-change positive">Margin: ${escapeHtml(summary.profitMargin || 0)}%</span>
            <span>Gross margin</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-card-header">
            <span class="metric-label">Total Purchases</span>
            <div class="metric-icon-box metric-icon-blue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
            </div>
          </div>
          <div class="metric-value num-metric">${formatINR(summary.totalPurchasesCost || 0)}</div>
          <div class="metric-footer">
            <span class="font-mono">${purchases.length}</span>
            <span>Inward consignments</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-card-header">
            <span class="metric-label">Available Stock</span>
            <div class="metric-icon-box metric-icon-amber">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </div>
          </div>
          <div class="metric-value num-metric">${totalStock.toLocaleString('en-IN')} <span style="font-size: 14px; font-weight: 500; color: var(--text-muted)">Units</span></div>
          <div class="metric-footer">
            <span class="metric-change ${lowStockCount > 0 ? 'negative' : 'positive'}">
              ${lowStockCount > 0 ? `⚠ ${lowStockCount} items low` : '✓ All nominal'}
            </span>
            <span>across warehouse</span>
          </div>
        </div>
      </div>

      <!-- KPI Metrics Cards Row 2 -->
      <div class="metrics-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 24px;">
        <div class="metric-card" style="padding: 16px;">
          <div style="font-size: 12px; color: var(--text-muted); font-weight: 600;">Catalog Products</div>
          <div style="font-size: 20px; font-weight: 700; margin-top: 4px;" class="font-mono">${products.length} Items</div>
        </div>
        <div class="metric-card" style="padding: 16px;">
          <div style="font-size: 12px; color: var(--text-muted); font-weight: 600;">Active Categories</div>
          <div style="font-size: 20px; font-weight: 700; margin-top: 4px;" class="font-mono">${categories.length} Categories</div>
        </div>
        <div class="metric-card" style="padding: 16px;">
          <div style="font-size: 12px; color: var(--text-muted); font-weight: 600;">Verified Suppliers</div>
          <div style="font-size: 20px; font-weight: 700; margin-top: 4px;" class="font-mono">${suppliers.length} Vendors</div>
        </div>
        <div class="metric-card" style="padding: 16px;">
          <div style="font-size: 12px; color: var(--text-muted); font-weight: 600;">Total Sales Orders</div>
          <div style="font-size: 20px; font-weight: 700; margin-top: 4px;" class="font-mono">${sales.length} Invoices</div>
        </div>
      </div>

      <!-- Charts Section: Monthly Sales vs Purchases -->
      <div class="dashboard-grid">
        <div class="chart-card">
          <div class="card-header-flex">
            <div>
              <h2 class="card-title">Revenue & Procurement Trends</h2>
              <div style="font-size: 12px; color: var(--text-muted);">Comparison of monthly sales revenue vs wholesale procurement (INR)</div>
            </div>
            <div class="chart-controls">
              <span class="badge badge-purple">● Sales</span>
              <span class="badge badge-info" style="margin-left: 6px;">● Purchases</span>
            </div>
          </div>
          <div class="chart-container" id="sales-analytics-chart">
            ${this.renderSalesChartSVG(sales, purchases, monthlyOverview)}
          </div>
        </div>

        <!-- Inventory Health & Distribution -->
        <div class="chart-card">
          <div class="card-header-flex">
            <h2 class="card-title">Inventory Stock Health</h2>
            <button class="btn btn-outline btn-sm" onclick="App.navigateTo('inventory')">Manage</button>
          </div>
          <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 8px;">
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 6px;">
                <span>In-Stock Products</span>
                <span class="font-mono font-medium">${products.filter(p => p.status === 'in_stock').length} of ${products.length}</span>
              </div>
              <div style="height: 8px; background-color: var(--bg-surface-subtle); border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; width: ${products.length ? (products.filter(p => p.status === 'in_stock').length / products.length) * 100 : 0}%; background-color: var(--color-success); border-radius: 4px;"></div>
              </div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 6px;">
                <span>Low-Stock Warnings</span>
                <span class="font-mono font-medium text-warning" style="color: var(--color-warning);">${products.filter(p => p.status === 'low_stock').length} products</span>
              </div>
              <div style="height: 8px; background-color: var(--bg-surface-subtle); border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; width: ${products.length ? (products.filter(p => p.status === 'low_stock').length / products.length) * 100 : 0}%; background-color: var(--color-warning); border-radius: 4px;"></div>
              </div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 6px;">
                <span>Out of Stock</span>
                <span class="font-mono font-medium text-danger" style="color: var(--color-danger);">${products.filter(p => p.status === 'out_of_stock').length} products</span>
              </div>
              <div style="height: 8px; background-color: var(--bg-surface-subtle); border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; width: ${products.length ? (products.filter(p => p.status === 'out_of_stock').length / products.length) * 100 : 0}%; background-color: var(--color-danger); border-radius: 4px;"></div>
              </div>
            </div>

            <div style="margin-top: 10px; padding: 12px; background-color: var(--bg-surface-subtle); border-radius: var(--radius-md); font-size: 12px; color: var(--text-secondary);">
              <strong>Estimated Asset Valuation:</strong><br/>
              Total Purchase Cost: <span class="font-mono font-bold">${formatINR(summary.totalInventoryValue || 0)}</span><br/>
              Expected Retail Value: <span class="font-mono font-bold">${formatINR(summary.totalRetailValue || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Double Column: Recent Transactions & Low Stock Alerts -->
      <div class="dashboard-grid">
        <!-- Recent Transactions -->
        <div class="data-card" style="margin-bottom: 0;">
          <div class="data-card-header">
            <div>
              <h2 class="card-title">Recent Transactions</h2>
              <div style="font-size: 12px; color: var(--text-muted)">Latest sales invoices and inward purchases</div>
            </div>
            <button class="btn btn-outline btn-sm" onclick="App.navigateTo('sales')">View All</button>
          </div>
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Reference</th>
                  <th>Entity</th>
                  <th>Date</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${combinedTx.length === 0 ? `
                  <tr><td colspan="5" class="text-center" style="padding: 24px; color: var(--text-muted);">No recent transactions recorded</td></tr>
                ` : combinedTx.map(tx => `
                  <tr>
                    <td>
                      <span class="badge ${tx.type === 'SALE' ? 'badge-success' : 'badge-info'}">
                        ${tx.type === 'SALE' ? 'Sale' : 'Purchase'}
                      </span>
                    </td>
                    <td class="font-mono" style="font-weight: 600;">${escapeHtml(tx.invoiceNumber)}</td>
                    <td>${escapeHtml(tx.party)}</td>
                    <td class="text-muted font-mono" style="font-size: 12px;">${formatDate(tx.date)}</td>
                    <td class="text-right font-mono font-bold">${formatINR(tx.amount)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Low Stock Alerts -->
        <div class="data-card" style="margin-bottom: 0;">
          <div class="data-card-header">
            <div>
              <h2 class="card-title">Low-Stock Watchlist</h2>
              <div style="font-size: 12px; color: var(--text-muted)">Items at or below reorder threshold</div>
            </div>
            <button class="btn btn-outline btn-sm" onclick="App.navigateTo('inventory')">Audit</button>
          </div>
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th class="text-center">Stock</th>
                  <th class="text-center">Min Level</th>
                  <th class="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                ${lowStockProducts.length === 0 ? `
                  <tr><td colspan="4" class="text-center" style="padding: 24px; color: var(--color-success);">✓ All stock quantities are healthy!</td></tr>
                ` : lowStockProducts.map(p => `
                  <tr>
                    <td>
                      <div style="font-weight: 600; font-size: 12.5px;">${escapeHtml(p.name)}</div>
                      <div class="sku-code">${escapeHtml(p.sku)}</div>
                    </td>
                    <td class="text-center font-mono font-bold" style="color: ${p.stockQuantity === 0 ? 'var(--color-danger)' : 'var(--color-warning)'}">
                      ${p.stockQuantity} ${escapeHtml(p.unit || '')}
                    </td>
                    <td class="text-center font-mono text-muted">${p.minStockLevel}</td>
                    <td class="text-right">
                      <button class="btn btn-outline btn-sm" onclick="PurchasesModule.openNewPurchaseModal('${escapeHtml(p._id)}')" title="Reorder product">
                        + Buy
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Top Selling Products Table -->
      <div class="data-card" style="margin-top: 24px;">
        <div class="data-card-header">
          <div>
            <h2 class="card-title">Top-Selling Products by Revenue</h2>
            <div style="font-size: 12px; color: var(--text-muted)">High-velocity items contributing to gross profit</div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="App.navigateTo('reports')">Full Breakdown</button>
        </div>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th style="width: 40px;">Rank</th>
                <th>Product Name</th>
                <th>SKU</th>
                <th class="text-center">Units Sold</th>
                <th class="text-right">Revenue Generated</th>
                <th class="text-right">Gross Profit</th>
              </tr>
            </thead>
            <tbody>
              ${topProducts.length === 0 ? `
                <tr><td colspan="6" class="text-center" style="padding: 24px; color: var(--text-muted)">No sales velocity data yet</td></tr>
              ` : topProducts.map((p, idx) => `
                <tr>
                  <td class="font-mono text-muted font-bold">#${idx + 1}</td>
                  <td style="font-weight: 600;">${escapeHtml(p.name || p.productName)}</td>
                  <td class="sku-code">${escapeHtml(p.sku)}</td>
                  <td class="text-center font-mono font-medium">${p.unitsSold}</td>
                  <td class="text-right font-mono font-bold">${formatINR(p.revenue)}</td>
                  <td class="text-right font-mono font-bold text-brand-purple">${formatINR(p.profit ?? p.grossProfit ?? 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    } catch (err) {
      console.error('Dashboard render failed:', err);
      App.renderError(container, {
        title: 'Dashboard Render Error',
        message: err?.message || 'An unexpected error occurred while rendering dashboard widgets.',
        retryAction: 'DashboardModule.render()'
      });
    }
  },

  formatAxisTick(val) {
    if (val >= 100000) return `${(val / 100000).toFixed(1).replace(/\.0$/, '')}L`;
    if (val >= 1000) return `${Math.round(val / 1000)}K`;
    return `${Math.round(val)}`;
  },

  // Generates clean, crisp inline SVG Bar chart from real sales & purchase records
  renderSalesChartSVG(sales, purchases, monthlyOverview = null) {
    let buckets = [];

    if (Array.isArray(monthlyOverview) && monthlyOverview.length > 0) {
      buckets = monthlyOverview.map(m => ({
        label: m.monthName,
        salesAmount: Number(m.salesAmount) || 0,
        purchasesAmount: Number(m.purchasesAmount) || 0
      }));
    } else {
      const allDates = [...sales, ...purchases]
        .map(d => new Date(d.createdAt))
        .filter(d => !Number.isNaN(d.getTime()));

      const anchor = allDates.length > 0
        ? new Date(Math.max(...allDates.map(d => d.getTime())))
        : new Date();

      for (let i = 5; i >= 0; i--) {
        const dt = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
        const y = dt.getFullYear();
        const m = dt.getMonth();
        const label = dt.toLocaleString('en-IN', { month: 'short' });

        const sTotal = sales
          .filter(s => {
            const sd = new Date(s.createdAt);
            return sd.getFullYear() === y && sd.getMonth() === m;
          })
          .reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);

        const pTotal = purchases
          .filter(p => {
            const pd = new Date(p.createdAt);
            return pd.getFullYear() === y && pd.getMonth() === m;
          })
          .reduce((sum, p) => sum + (Number(p.grandTotal) || 0), 0);

        buckets.push({ label, salesAmount: sTotal, purchasesAmount: pTotal });
      }
    }

    const rawMax = Math.max(1000, ...buckets.flatMap(b => [b.salesAmount, b.purchasesAmount]));
    const maxVal = Math.ceil(rawMax * 1.15);
    const height = 220;
    const width = 580;
    const chartHeight = height - 40;
    const barWidth = 24;

    const bars = buckets.map((b, i) => {
      const sVal = b.salesAmount;
      const pVal = b.purchasesAmount;
      const sH = maxVal > 0 ? (sVal / maxVal) * chartHeight : 0;
      const pH = maxVal > 0 ? (pVal / maxVal) * chartHeight : 0;
      const x = 50 + (i * 90);

      return `
        <g class="chart-group">
          <rect x="${x}" y="${height - 20 - pH}" width="${barWidth}" height="${Math.max(pH, pVal > 0 ? 3 : 0)}" fill="#3978F6" rx="4" opacity="0.85">
            <title>${escapeHtml(b.label)} Purchases: ${formatINR(pVal)}</title>
          </rect>
          <rect x="${x + barWidth + 4}" y="${height - 20 - sH}" width="${barWidth}" height="${Math.max(sH, sVal > 0 ? 3 : 0)}" fill="#6C4CF1" rx="4">
            <title>${escapeHtml(b.label)} Sales: ${formatINR(sVal)}</title>
          </rect>
          <text x="${x + barWidth}" y="${height}" text-anchor="middle" font-size="11" font-family="'Plus Jakarta Sans', sans-serif" fill="#64748B">${escapeHtml(b.label)}</text>
        </g>
      `;
    }).join('');

    return `
      <svg viewBox="0 0 ${width} ${height + 10}" class="svg-chart" style="overflow: visible;">
        <!-- Grid lines -->
        <line x1="36" y1="20" x2="${width}" y2="20" stroke="var(--border-color)" stroke-dasharray="3 3" opacity="0.6" />
        <line x1="36" y1="73" x2="${width}" y2="73" stroke="var(--border-color)" stroke-dasharray="3 3" opacity="0.6" />
        <line x1="36" y1="127" x2="${width}" y2="127" stroke="var(--border-color)" stroke-dasharray="3 3" opacity="0.6" />
        <line x1="36" y1="180" x2="${width}" y2="180" stroke="var(--border-color)" stroke-dasharray="3 3" opacity="0.6" />

        <!-- Dynamic Y Axis Markers -->
        <text x="30" y="24" text-anchor="end" font-size="10" font-family="'JetBrains Mono', monospace" fill="#94A3B8">${this.formatAxisTick(maxVal)}</text>
        <text x="30" y="77" text-anchor="end" font-size="10" font-family="'JetBrains Mono', monospace" fill="#94A3B8">${this.formatAxisTick(maxVal * 0.66)}</text>
        <text x="30" y="131" text-anchor="end" font-size="10" font-family="'JetBrains Mono', monospace" fill="#94A3B8">${this.formatAxisTick(maxVal * 0.33)}</text>
        <text x="30" y="184" text-anchor="end" font-size="10" font-family="'JetBrains Mono', monospace" fill="#94A3B8">0</text>

        ${bars}
      </svg>
    `;
  }
};

window.DashboardModule = DashboardModule;
