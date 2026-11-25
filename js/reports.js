/**
 * Smart Inventory Management System - Reports Module
 * Handles sales reports, purchase reports, stock valuation,
 * profit & loss calculations, product-wise sales velocity, and CSV exports.
 */

const ReportsModule = {
  activeDateRange: 'all', // 'today', 'week', 'month', 'all'
  activeReportType: 'sales', // 'sales', 'purchases', 'inventory', 'profit', 'product-wise'

  async init() {
    await this.render();
  },

  async render() {
    const container = document.getElementById('module-reports');
    if (!container) return;

    App.renderLoading(container, 'Generating executive reports...');

    try {
      const [res, productsRes] = await Promise.all([
        api.reports.getSummary(this.activeDateRange),
        api.products.getAll()
      ]);

      if (!res || res.success === false) {
        App.renderError(container, {
          title: 'Failed to Load Reports',
          message: res?.error || 'Could not generate financial reports from the API.',
          retryAction: 'ReportsModule.render()'
        });
        return;
      }

      const summary = res.data || {};
      const products = productsRes?.data || [];

      this.summary = summary;
      this.products = products;

      container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Executive Reports & Financial Statements</h1>
          <p class="page-subtitle">Analyze gross margins, sales velocity, purchase costs, inventory asset value, and export CSV logs.</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-outline" onclick="window.print()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Print Report
          </button>
          <button class="btn btn-primary" onclick="ReportsModule.exportCSV()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Download CSV Export
          </button>
        </div>
      </div>

      <!-- Financial Snapshot Cards -->
      <div class="metrics-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom: 24px;">
        <div class="metric-card">
          <div class="metric-card-header">
            <span class="metric-label">Sales Revenue</span>
            <div class="metric-icon-box metric-icon-purple">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline></svg>
            </div>
          </div>
          <div class="metric-value num-metric">${formatINR(summary.totalSalesRevenue || 0)}</div>
          <div class="metric-footer">${summary.totalSalesCount || 0} Invoices billed</div>
        </div>

        <div class="metric-card">
          <div class="metric-card-header">
            <span class="metric-label">Cost of Goods Sold (COGS)</span>
            <div class="metric-icon-box metric-icon-blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
          </div>
          <div class="metric-value num-metric">${formatINR(summary.cogs || 0)}</div>
          <div class="metric-footer">Wholesale procurement cost</div>
        </div>

        <div class="metric-card">
          <div class="metric-card-header">
            <span class="metric-label">Gross Profit</span>
            <div class="metric-icon-box metric-icon-green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
          </div>
          <div class="metric-value num-metric" style="color: var(--color-success);">${formatINR(summary.estimatedProfit || 0)}</div>
          <div class="metric-footer">Gross Margin: <strong class="font-mono">${summary.profitMargin || 0}%</strong></div>
        </div>

        <div class="metric-card">
          <div class="metric-card-header">
            <span class="metric-label">Total Inventory Assets</span>
            <div class="metric-icon-box metric-icon-amber">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
            </div>
          </div>
          <div class="metric-value num-metric">${formatINR(summary.totalInventoryValue || 0)}</div>
          <div class="metric-footer">${summary.totalAvailableUnits || 0} units on shelf</div>
        </div>
      </div>

      <!-- Controls Row: Date Range Filter & Report Type Switcher -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 14px;">
        <div class="segmented-tabs">
          <button class="segmented-tab ${this.activeReportType === 'sales' ? 'active' : ''}" onclick="ReportsModule.setReportType('sales')">
            Sales Report
          </button>
          <button class="segmented-tab ${this.activeReportType === 'purchases' ? 'active' : ''}" onclick="ReportsModule.setReportType('purchases')">
            Purchase Report
          </button>
          <button class="segmented-tab ${this.activeReportType === 'profit' ? 'active' : ''}" onclick="ReportsModule.setReportType('profit')">
            Profit & Margin
          </button>
          <button class="segmented-tab ${this.activeReportType === 'inventory' ? 'active' : ''}" onclick="ReportsModule.setReportType('inventory')">
            Stock Valuation
          </button>
          <button class="segmented-tab ${this.activeReportType === 'product-wise' ? 'active' : ''}" onclick="ReportsModule.setReportType('product-wise')">
            Product-Wise Sales
          </button>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 12.5px; color: var(--text-muted); font-weight: 600;">Timeframe:</span>
          <select class="filter-select" onchange="ReportsModule.setDateRange(this.value)">
            <option value="all" ${this.activeDateRange === 'all' ? 'selected' : ''}>All Historical Time</option>
            <option value="today" ${this.activeDateRange === 'today' ? 'selected' : ''}>Today Only</option>
            <option value="week" ${this.activeDateRange === 'week' ? 'selected' : ''}>This Week (Last 7 Days)</option>
            <option value="month" ${this.activeDateRange === 'month' ? 'selected' : ''}>This Month (MTD)</option>
          </select>
        </div>
      </div>

      <!-- Dynamic Report View Table -->
      ${this.renderActiveReportTable()}
    `;
    } catch (err) {
      console.error('Reports render error:', err);
      App.renderError(container, {
        title: 'Reports Page Error',
        message: err?.message || 'Unexpected error rendering financial reports.',
        retryAction: 'ReportsModule.render()'
      });
    }
  },

  setReportType(type) {
    this.activeReportType = type;
    this.render();
  },

  setDateRange(range) {
    this.activeDateRange = range;
    this.render();
  },

  renderActiveReportTable() {
    switch (this.activeReportType) {
      case 'sales':
        return this.renderSalesReport();
      case 'purchases':
        return this.renderPurchasesReport();
      case 'profit':
        return this.renderProfitReport();
      case 'inventory':
        return this.renderInventoryReport();
      case 'product-wise':
        return this.renderProductWiseReport();
      default:
        return this.renderSalesReport();
    }
  },

  renderSalesReport() {
    const sales = this.summary.sales || [];
    return `
      <div class="data-card">
        <div class="data-card-header">
          <h2 class="card-title">Sales Order Register</h2>
          <span style="font-size: 13px; color: var(--text-muted);">${sales.length} invoices generated</span>
        </div>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Customer Name</th>
                <th>Payment Mode</th>
                <th class="text-right">Taxable Subtotal</th>
                <th class="text-right">GST Amount</th>
                <th class="text-right">Grand Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${sales.length === 0 ? `
                <tr><td colspan="7" class="text-center" style="padding: 24px; color: var(--text-muted)">No sales recorded for this timeframe</td></tr>
              ` : sales.map(s => `
                <tr>
                  <td class="font-mono font-bold">${escapeHtml(s.invoiceNumber)}</td>
                  <td class="font-mono text-muted" style="font-size: 12px;">${formatDate(s.createdAt)}</td>
                  <td style="font-weight: 600;">${escapeHtml(s.customerName || 'Walk-in')}</td>
                  <td>${escapeHtml(s.paymentMethod || 'UPI')}</td>
                  <td class="text-right font-mono">${formatINR(s.subtotal)}</td>
                  <td class="text-right font-mono text-muted">${formatINR(s.taxAmount)}</td>
                  <td class="text-right font-mono font-bold text-brand-purple">${formatINR(s.grandTotal)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderPurchasesReport() {
    const purchases = this.summary.purchases || [];
    return `
      <div class="data-card">
        <div class="data-card-header">
          <h2 class="card-title">Procurement Spend Register</h2>
          <span style="font-size: 13px; color: var(--text-muted);">${purchases.length} supplier inward bills</span>
        </div>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>PO Reference #</th>
                <th>Inward Date</th>
                <th>Supplier / Vendor</th>
                <th>Payment Term</th>
                <th class="text-right">Subtotal</th>
                <th class="text-right">Input Tax Credit (ITC)</th>
                <th class="text-right">Total Incurred (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${purchases.length === 0 ? `
                <tr><td colspan="7" class="text-center" style="padding: 24px; color: var(--text-muted)">No purchases recorded for this timeframe</td></tr>
              ` : purchases.map(p => `
                <tr>
                  <td class="font-mono font-bold">${escapeHtml(p.invoiceNumber)}</td>
                  <td class="font-mono text-muted" style="font-size: 12px;">${formatDate(p.createdAt)}</td>
                  <td style="font-weight: 600;">${escapeHtml(p.supplierName)}</td>
                  <td>${escapeHtml(p.paymentMethod || 'Bank Transfer')}</td>
                  <td class="text-right font-mono">${formatINR(p.subtotal)}</td>
                  <td class="text-right font-mono text-muted">${formatINR(p.taxAmount)}</td>
                  <td class="text-right font-mono font-bold text-brand-blue">${formatINR(p.grandTotal)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderProfitReport() {
    const s = this.summary;
    return `
      <div class="data-card">
        <div class="data-card-header">
          <h2 class="card-title">Profit & Loss Analysis Statement</h2>
          <span style="font-size: 13px; color: var(--text-muted);">Calculated via FIFO Unit Acquisition Costs</span>
        </div>
        <div style="padding: 24px; max-width: 700px;">
          <table class="table" style="border: 1px solid var(--border-color);">
            <tbody>
              <tr>
                <td style="font-weight: 600; padding: 14px;">Total Sales Invoiced (Gross Revenue)</td>
                <td class="text-right font-mono font-bold" style="padding: 14px; font-size: 15px;">${formatINR(s.totalSalesRevenue || 0)}</td>
              </tr>
              <tr style="background-color: var(--bg-surface-subtle);">
                <td style="font-weight: 600; padding: 14px; color: var(--text-secondary);">Less: Cost of Goods Sold (Procurement Base Cost)</td>
                <td class="text-right font-mono text-danger" style="padding: 14px; font-size: 15px;">- ${formatINR(s.cogs || 0)}</td>
              </tr>
              <tr style="background-color: var(--color-primary-light);">
                <td style="font-weight: 700; padding: 16px; font-size: 16px; color: var(--color-primary);">Gross Operational Profit</td>
                <td class="text-right font-mono font-bold" style="padding: 16px; font-size: 18px; color: var(--color-primary);">${formatINR(s.estimatedProfit || 0)}</td>
              </tr>
              <tr>
                <td style="font-weight: 600; padding: 14px;">Gross Margin %</td>
                <td class="text-right font-mono font-bold" style="padding: 14px; font-size: 15px; color: var(--color-success);">${s.profitMargin || 0}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderInventoryReport() {
    const products = this.products;
    return `
      <div class="data-card">
        <div class="data-card-header">
          <h2 class="card-title">Inventory Asset Valuation Register</h2>
          <span style="font-size: 13px; color: var(--text-muted);">${products.length} distinct catalog items</span>
        </div>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th class="text-center">Stock on Hand</th>
                <th class="text-right">Unit Buy Cost</th>
                <th class="text-right">Unit Sell Price</th>
                <th class="text-right">Total Cost Asset (₹)</th>
                <th class="text-right">Potential Sales Value (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${products.map(p => {
                const costValuation = p.stockQuantity * p.purchasePrice;
                const salesValuation = p.stockQuantity * p.sellingPrice;
                return `
                  <tr>
                    <td style="font-weight: 600;">${escapeHtml(p.name)}</td>
                    <td class="sku-code">${escapeHtml(p.sku)}</td>
                    <td class="text-center font-mono font-bold">${p.stockQuantity} ${escapeHtml(p.unit)}</td>
                    <td class="text-right font-mono text-muted">${formatINR(p.purchasePrice)}</td>
                    <td class="text-right font-mono">${formatINR(p.sellingPrice)}</td>
                    <td class="text-right font-mono font-bold">${formatINR(costValuation)}</td>
                    <td class="text-right font-mono font-bold text-brand-purple">${formatINR(salesValuation)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderProductWiseReport() {
    const breakdown = this.summary.productBreakdown || [];
    return `
      <div class="data-card">
        <div class="data-card-header">
          <h2 class="card-title">Product-Wise Sales Velocity & Contribution</h2>
          <span style="font-size: 13px; color: var(--text-muted);">Ranked by gross sales volume</span>
        </div>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Item Description</th>
                <th>SKU</th>
                <th class="text-center">Units Sold</th>
                <th class="text-right">Revenue (₹)</th>
                <th class="text-right">Procurement Cost (₹)</th>
                <th class="text-right">Gross Profit (₹)</th>
                <th class="text-center">Margin %</th>
              </tr>
            </thead>
            <tbody>
              ${breakdown.length === 0 ? `
                <tr><td colspan="7" class="text-center" style="padding: 24px; color: var(--text-muted)">No product sales recorded in this period</td></tr>
              ` : breakdown.map(p => `
                <tr>
                  <td style="font-weight: 600;">${escapeHtml(p.name)}</td>
                  <td class="sku-code">${escapeHtml(p.sku)}</td>
                  <td class="text-center font-mono font-bold">${p.unitsSold}</td>
                  <td class="text-right font-mono font-bold">${formatINR(p.revenue)}</td>
                  <td class="text-right font-mono text-muted">${formatINR(p.cost)}</td>
                  <td class="text-right font-mono font-bold text-brand-purple">${formatINR(p.profit)}</td>
                  <td class="text-center font-mono font-medium">${p.margin}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  csvCell(value) {
    const str = String(value ?? '');
    return `"${str.replace(/"/g, '""')}"`;
  },

  exportCSV() {
    const filename = `SmartInventory_${this.activeReportType}_${this.activeDateRange}_${Date.now()}.csv`;
    const rows = [];

    if (this.activeReportType === 'sales') {
      rows.push(['Invoice Number', 'Date', 'Customer Name', 'Phone', 'Payment Mode', 'Subtotal', 'Tax Rate', 'Tax Amount', 'Grand Total'].map(this.csvCell));
      (this.summary.sales || []).forEach(s => {
        rows.push([
          this.csvCell(s.invoiceNumber),
          this.csvCell(s.createdAt),
          this.csvCell(s.customerName || ''),
          this.csvCell(s.customerPhone || ''),
          this.csvCell(s.paymentMethod || ''),
          s.subtotal ?? 0,
          s.taxRate ?? 0,
          s.taxAmount ?? 0,
          s.grandTotal ?? 0
        ]);
      });
    } else if (this.activeReportType === 'purchases') {
      rows.push(['PO Number', 'Date', 'Supplier Name', 'Payment Mode', 'Subtotal', 'Tax Rate', 'Tax Amount', 'Grand Total'].map(this.csvCell));
      (this.summary.purchases || []).forEach(p => {
        rows.push([
          this.csvCell(p.invoiceNumber),
          this.csvCell(p.createdAt),
          this.csvCell(p.supplierName || ''),
          this.csvCell(p.paymentMethod || ''),
          p.subtotal ?? 0,
          p.taxRate ?? 0,
          p.taxAmount ?? 0,
          p.grandTotal ?? 0
        ]);
      });
    } else if (this.activeReportType === 'profit') {
      const s = this.summary || {};
      rows.push(['Metric', 'Value'].map(this.csvCell));
      rows.push([this.csvCell('Timeframe'), this.csvCell(this.activeDateRange)]);
      rows.push([this.csvCell('Total Sales Invoiced (Gross Revenue)'), s.totalSalesRevenue ?? 0]);
      rows.push([this.csvCell('Cost of Goods Sold (COGS)'), s.cogs ?? 0]);
      rows.push([this.csvCell('Gross Operational Profit'), s.estimatedProfit ?? 0]);
      rows.push([this.csvCell('Gross Margin %'), `${s.profitMargin ?? 0}%`]);
    } else if (this.activeReportType === 'inventory') {
      rows.push(['Product Name', 'SKU', 'Category', 'Stock Quantity', 'Unit', 'Purchase Price', 'Selling Price', 'Inventory Cost Valuation'].map(this.csvCell));
      this.products.forEach(p => {
        rows.push([
          this.csvCell(p.name),
          this.csvCell(p.sku),
          this.csvCell(p.categoryName || ''),
          p.stockQuantity ?? 0,
          this.csvCell(p.unit || 'pcs'),
          p.purchasePrice ?? 0,
          p.sellingPrice ?? 0,
          (p.stockQuantity ?? 0) * (p.purchasePrice ?? 0)
        ]);
      });
    } else {
      // Product-wise breakdown
      rows.push(['Product Name', 'SKU', 'Units Sold', 'Revenue (INR)', 'Cost (INR)', 'Gross Profit (INR)', 'Margin %'].map(this.csvCell));
      (this.summary.productBreakdown || []).forEach(p => {
        rows.push([
          this.csvCell(p.name),
          this.csvCell(p.sku),
          p.unitsSold ?? 0,
          p.revenue ?? 0,
          p.cost ?? 0,
          p.profit ?? 0,
          p.margin ?? 0
        ]);
      });
    }

    const csvText = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    App.showToast(`CSV report downloaded: ${filename}`, 'success');
  }
};

window.ReportsModule = ReportsModule;
