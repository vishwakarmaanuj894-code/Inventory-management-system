/**
 * Smart Inventory Management System - Centralized API Service Layer
 * Fully integrated with ASP.NET Core Web API & MongoDB Atlas.
 * Communicates using fetch() with JWT Bearer authentication, loading states,
 * and graceful fallback to localStorage when backend server is in standby.
 */

const API_CONFIG = {
  // Configured in one central place:
  baseUrl: localStorage.getItem('sims_api_base_url') || 'http://localhost:5000/api',
  // Enabled by default if user turned it on, or auto-negotiated on ping
  useBackendApi: localStorage.getItem('sims_use_backend') === 'true',
  jwtTokenKey: 'sims_jwt_token',
  timeoutMs: 10000
};

/**
 * Core HTTP Request Engine for ASP.NET Core Web API
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_CONFIG.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const token = localStorage.getItem(API_CONFIG.jwtTokenKey);

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Handle 401 Unauthorized
    if (response.status === 401) {
      console.warn('API returned 401 Unauthorized. Clearing token.');
      localStorage.removeItem(API_CONFIG.jwtTokenKey);
      if (window.App && typeof window.App.showToast === 'function') {
        window.App.showToast('Session expired. Please sign in again.', 'warning');
      }
      return { success: false, error: 'Unauthorized. Please sign in again.' };
    }

    const json = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = json?.message || (json?.errors ? json.errors.join(', ') : `HTTP ${response.status} Error`);
      return {
        success: false,
        error: errorMsg,
        errors: json?.errors || [errorMsg],
        status: response.status
      };
    }

    return json || { success: true };
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`Backend API fetch failed for ${endpoint}:`, err.message);
    return {
      success: false,
      error: err.name === 'AbortError' ? 'Request timed out' : 'Cannot connect to ASP.NET Core API server at ' + API_CONFIG.baseUrl,
      isNetworkError: true
    };
  }
}

// Local mock fallback helper for seamless development preview
const delay = (ms = 40) => new Promise(resolve => setTimeout(resolve, ms));

const api = {
  config: API_CONFIG,

  /**
   * Ping backend to check if ASP.NET Core is running
   */
  async checkBackendHealth() {
    try {
      const res = await apiRequest('/dashboard/summary');
      return !res.isNetworkError;
    } catch {
      return false;
    }
  },

  setBackendMode(enabled, customUrl = null) {
    API_CONFIG.useBackendApi = enabled;
    localStorage.setItem('sims_use_backend', enabled ? 'true' : 'false');
    if (customUrl) {
      API_CONFIG.baseUrl = customUrl;
      localStorage.setItem('sims_api_base_url', customUrl);
    }
  },

  // 1. Authentication Controller (/api/auth)
  auth: {
    async login(email, password) {
      if (API_CONFIG.useBackendApi) {
        const res = await apiRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });

        if (res.success && res.data?.token) {
          localStorage.setItem(API_CONFIG.jwtTokenKey, res.data.token);
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(res.data.user));
          return { success: true, data: res.data.user };
        } else if (!res.isNetworkError) {
          return { success: false, error: res.error || 'Invalid credentials' };
        }
      }

      // Local storage fallback for standalone preview
      await delay();
      const users = StorageService.getCollection(STORAGE_KEYS.USERS);
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (user) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
        return { success: true, data: user };
      }
      return { success: false, error: "Invalid email or password" };
    },

    async getCurrentUser() {
      if (API_CONFIG.useBackendApi && localStorage.getItem(API_CONFIG.jwtTokenKey)) {
        const res = await apiRequest('/auth/me');
        if (res.success && res.data) {
          return res.data;
        }
      }
      try {
        const u = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
        return u ? JSON.parse(u) : null;
      } catch {
        return null;
      }
    },

    async logout() {
      localStorage.removeItem(API_CONFIG.jwtTokenKey);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      return { success: true };
    }
  },

  // 2. Products Controller (/api/products)
  products: {
    async getAll(filters = {}) {
      if (API_CONFIG.useBackendApi) {
        const query = new URLSearchParams();
        if (filters.search) query.append('search', filters.search);
        if (filters.categoryId && filters.categoryId !== 'all') query.append('categoryId', filters.categoryId);
        if (filters.status && filters.status !== 'all') query.append('status', filters.status);

        const res = await apiRequest(`/products?${query.toString()}`);
        if (res.success) return { success: true, data: res.data };
      }

      await delay();
      let products = StorageService.getCollection(STORAGE_KEYS.PRODUCTS);
      if (filters.search) {
        const q = filters.search.toLowerCase();
        products = products.filter(p =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.categoryName && p.categoryName.toLowerCase().includes(q))
        );
      }
      if (filters.categoryId && filters.categoryId !== 'all') {
        products = products.filter(p => p.categoryId === filters.categoryId);
      }
      if (filters.status && filters.status !== 'all') {
        products = products.filter(p => p.status === filters.status);
      }
      return { success: true, data: products };
    },

    async getById(id) {
      if (API_CONFIG.useBackendApi) {
        const res = await apiRequest(`/products/${id}`);
        if (res.success) return { success: true, data: res.data };
      }
      await delay();
      const product = StorageService.findById(STORAGE_KEYS.PRODUCTS, id);
      if (!product) return { success: false, error: "Product not found" };
      return { success: true, data: product };
    },

    async create(productData) {
      if (API_CONFIG.useBackendApi) {
        const res = await apiRequest('/products', {
          method: 'POST',
          body: JSON.stringify(productData)
        });
        if (res.success) return { success: true, data: res.data };
        return { success: false, error: res.error };
      }

      await delay();
      const existing = StorageService.getCollection(STORAGE_KEYS.PRODUCTS);
      if (existing.some(p => p.sku.toLowerCase() === productData.sku.toLowerCase())) {
        return { success: false, error: `SKU '${productData.sku}' already exists` };
      }

      const stock = Number(productData.stockQuantity) || 0;
      const minStock = Number(productData.minStockLevel) || 5;
      let status = 'in_stock';
      if (stock === 0) status = 'out_of_stock';
      else if (stock <= minStock) status = 'low_stock';

      const newProduct = {
        ...productData,
        stockQuantity: stock,
        minStockLevel: minStock,
        purchasePrice: Number(productData.purchasePrice) || 0,
        sellingPrice: Number(productData.sellingPrice) || 0,
        status
      };

      const created = StorageService.insert(STORAGE_KEYS.PRODUCTS, newProduct);
      if (stock > 0) {
        StorageService.insert(STORAGE_KEYS.STOCK_TRANSACTIONS, {
          productId: created._id,
          productName: created.name,
          sku: created.sku,
          type: "ADJUSTMENT_ADD",
          quantity: stock,
          previousStock: 0,
          newStock: stock,
          referenceId: "Initial Stock",
          notes: "Initial inventory setup",
          timestamp: new Date().toISOString()
        });
      }
      return { success: true, data: created };
    },

    async update(id, updates) {
      if (API_CONFIG.useBackendApi) {
        const res = await apiRequest(`/products/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates)
        });
        if (res.success) return { success: true, data: res.data };
        return { success: false, error: res.error };
      }

      await delay();
      const existing = StorageService.findById(STORAGE_KEYS.PRODUCTS, id);
      if (!existing) return { success: false, error: "Product not found" };

      if (updates.sku && updates.sku.toLowerCase() !== existing.sku.toLowerCase()) {
        const all = StorageService.getCollection(STORAGE_KEYS.PRODUCTS);
        if (all.some(p => p._id !== id && p.sku.toLowerCase() === updates.sku.toLowerCase())) {
          return { success: false, error: `SKU '${updates.sku}' is already in use` };
        }
      }

      const stock = updates.stockQuantity !== undefined ? Number(updates.stockQuantity) : existing.stockQuantity;
      const minStock = updates.minStockLevel !== undefined ? Number(updates.minStockLevel) : existing.minStockLevel;
      let status = 'in_stock';
      if (stock === 0) status = 'out_of_stock';
      else if (stock <= minStock) status = 'low_stock';

      const updated = StorageService.update(STORAGE_KEYS.PRODUCTS, id, {
        ...updates,
        stockQuantity: stock,
        minStockLevel: minStock,
        status
      });
      return { success: true, data: updated };
    },

    async delete(id) {
      if (API_CONFIG.useBackendApi) {
        const res = await apiRequest(`/products/${id}`, { method: 'DELETE' });
        if (res.success) return { success: true, message: "Product deleted successfully" };
        return { success: false, error: res.error };
      }

      await delay();
      const product = StorageService.findById(STORAGE_KEYS.PRODUCTS, id);
      if (!product) return { success: false, error: "Product not found" };
      StorageService.delete(STORAGE_KEYS.PRODUCTS, id);
      return { success: true, message: "Product deleted successfully" };
    }
  },

  // 3. Categories Controller (/api/categories)
  categories: {
    async getAll() {
      if (API_CONFIG.useBackendApi) {
        const res = await apiRequest('/categories');
        if (res.success) return { success: true, data: res.data };
      }

      await delay();
      const categories = StorageService.getCollection(STORAGE_KEYS.CATEGORIES);
      const products = StorageService.getCollection(STORAGE_KEYS.PRODUCTS);
      const categoriesWithCount = categories.map(cat => ({
        ...cat,
        productCount: products.filter(p => p.categoryId === cat._id).length
      }));
      return { success: true, data: categoriesWithCount };
    },

    async create(categoryData) {
      if (API_CONFIG.useBackendApi) {
        const res = await apiRequest('/categories', {
          method: 'POST',
          body: JSON.stringify(categoryData)
        });
        if (res.success) return { success: true, data: res.data };
        return { success: false, error: res.error };
      }

      await delay();
      const categories = StorageService.getCollection(STORAGE_KEYS.CATEGORIES);
      if (categories.some(c => c.name.toLowerCase() === categoryData.name.toLowerCase())) {
        return { success: false, error: `Category '${categoryData.name}' already exists` };
      }
      const created = StorageService.insert(STORAGE_KEYS.CATEGORIES, categoryData);
      return { success: true, data: created };
    },

    async update(id, updates) {
      if (API_CONFIG.useBackendApi) {
        const res = await apiRequest(`/categories/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates)
        });
        if (res.success) return { success: true, data: res.data };
        return { success: false, error: res.error };
      }

      await delay();
      const updated = StorageService.update(STORAGE_KEYS.CATEGORIES, id, updates);
      if (!updated) return { success: false, error: "Category not found" };
      return { success: true, data: updated };
    },

    async delete(id) {
      if (API_CONFIG.useBackendApi) {
        const res = await apiRequest(`/categories/${id}`, { method: 'DELETE' });
        if (res.success) return { success: true, message: "Category deleted successfully" };
        return { success: false, error: res.error };
      }

      await delay();
      const products = StorageService.getCollection(STORAGE_KEYS.PRODUCTS);
      const assignedCount = products.filter(p => p.categoryId === id).length;
      if (assignedCount > 0) {
        return {
          success: false,
          error: `Cannot delete category: ${assignedCount} active product(s) are currently assigned to it. Please reassign or delete the products first.`
        };
      }
      StorageService.delete(STORAGE_KEYS.CATEGORIES, id);
      return { success: true, message: "Category deleted successfully" };
    }
  },

  // 4. Suppliers Controller (/api/suppliers)
  suppliers: {
    async getAll() {
      if (API_CONFIG.useBackendApi) {
        const res = await apiRequest('/suppliers');
        if (res.success) return { success: true, data: res.data };
      }

      await delay();
      const suppliers = StorageService.getCollection(STORAGE_KEYS.SUPPLIERS);
      const purchases = StorageService.getCollection(STORAGE_KEYS.PURCHASES);
      const enriched = suppliers.map(sup => {
        const supPurchases = purchases.filter(po => po.supplierId === sup._id);
        return {
          ...sup,
          purchaseOrdersCount: supPurchases.length,
          totalPurchasedAmount: supPurchases.reduce((sum, po) => sum + (po.grandTotal || 0), 0)
        };
      });
      return { success: true, data: enriched };
    },

    async getById(id) {
      if (API_CONFIG.useBackendApi) {
        const res = await apiRequest(`/suppliers/${id}`);
        if (res.success) return { success: true, data: res.data };
      }
      await delay();
      const sup = StorageService.findById(STORAGE_KEYS.SUPPLIERS, id);
      if (!sup) return { success: false, error: "Supplier not found" };
      return { success: true, data: sup };
    },

    async getPurchases(supplierId) {
      if (API_CONFIG.useBackendApi) {
        const res = await apiRequest(`/purchases?supplierId=${supplierId}`);
        if (res.success) return { success: true, data: res.data };
      }
      await delay();
      const purchases = StorageService.getCollection(STORAGE_KEYS.PURCHASES);
      return { success: true, data: purchases.filter(p => p.supplierId === supplierId) };
    },

    async create(supplierData) {
      if (API_CONFIG.useBackendApi) {
        const res = await apiRequest('/suppliers', {
          method: 'POST',
          body: JSON.stringify(supplierData)
        });
        if (res.success) return { success: true, data: res.data };
        return { success: false, error: res.error };
      }

      await delay();
      const created = StorageService.insert(STORAGE_KEYS.SUPPLIERS, supplierData);
      return { success: true, data: created };
    },

    async update(id, updates) {
      if (API_CONFIG.useBackendApi) {
        const res = await apiRequest(`/suppliers/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates)
        });
        if (res.success) return { success: true, data: res.data };
        return { success: false, error: res.error };
      }

      await delay();
      const updated = StorageService.update(STORAGE_KEYS.SUPPLIERS, id, updates);
      if (!updated) return { success: false, error: "Supplier not found" };
      return { success: true, data: updated };
    },

    async delete(id) {
      if (API_CONFIG.useBackendApi) {
        const res = await apiRequest(`/suppliers/${id}`, { method: 'DELETE' });
        if (res.success) return { success: true, message: "Supplier deleted successfully" };
        return { success: false, error: res.error };
      }

      await delay();
      StorageService.delete(STORAGE_KEYS.SUPPLIERS, id);
      return { success: true, message: "Supplier deleted successfully" };
    }
  },

  // 5. Purchases Controller (/api/purchases)
  purchases: {
    async getAll() {
      if (API_CONFIG.useBackendApi) {
        const res = await apiRequest('/purchases');
        if (res.success) return { success: true, data: res.data };
      }
      await delay();
      return { success: true, data: StorageService.getCollection(STORAGE_KEYS.PURCHASES) };
    },

    async getById(id) {
      if (API_CONFIG.useBackendApi) {
        const res = await apiRequest(`/purchases/${id}`);
        if (res.success) return { success: true, data: res.data };
      }
      await delay();
      const po = StorageService.findById(STORAGE_KEYS.PURCHASES, id);
      if (!po) return { success: false, error: "Purchase invoice not found" };
      return { success: true, data: po };
    },

    async create(purchaseData) {
      if (API_CONFIG.useBackendApi) {
        const res = await apiRequest('/purchases', {
          method: 'POST',
          body: JSON.stringify(purchaseData)
        });
        if (res.success) return { success: true, data: res.data };
        return { success: false, error: res.error };
      }

      await delay();
      if (!purchaseData.items || purchaseData.items.length === 0) {
        return { success: false, error: "Purchase must contain at least one product item" };
      }

      const invoiceNumber = purchaseData.invoiceNumber || `PUR-2026-${String(Date.now()).slice(-4)}`;
      const timestamp = new Date().toISOString();

      const newPurchase = {
        ...purchaseData,
        invoiceNumber,
        status: purchaseData.status || "Completed",
        createdAt: timestamp
      };

      const created = StorageService.insert(STORAGE_KEYS.PURCHASES, newPurchase);

      // Increase stock
      const products = StorageService.getCollection(STORAGE_KEYS.PRODUCTS);
      for (const item of purchaseData.items) {
        const prodIndex = products.findIndex(p => p._id === item.productId);
        if (prodIndex !== -1) {
          const prod = products[prodIndex];
          const prevStock = prod.stockQuantity;
          const addedQty = Number(item.quantity) || 0;
          const newStock = prevStock + addedQty;

          let status = 'in_stock';
          if (newStock === 0) status = 'out_of_stock';
          else if (newStock <= prod.minStockLevel) status = 'low_stock';

          prod.stockQuantity = newStock;
          prod.status = status;
          if (item.purchasePrice && Number(item.purchasePrice) > 0) {
            prod.purchasePrice = Number(item.purchasePrice);
          }

          StorageService.insert(STORAGE_KEYS.STOCK_TRANSACTIONS, {
            productId: prod._id,
            productName: prod.name,
            sku: prod.sku,
            type: "PURCHASE",
            quantity: addedQty,
            previousStock: prevStock,
            newStock: newStock,
            referenceId: invoiceNumber,
            notes: `Purchased from ${purchaseData.supplierName}`,
            timestamp
          });
        }
      }
      StorageService.saveCollection(STORAGE_KEYS.PRODUCTS, products);
      return { success: true, data: created };
    }
  },

  // 6. Sales Controller (/api/sales)
  sales: {
    async getAll() {
      if (API_CONFIG.useBackendApi) {
        const res = await apiRequest('/sales');
        if (res.success) return { success: true, data: res.data };
      }
      await delay();
      return { success: true, data: StorageService.getCollection(STORAGE_KEYS.SALES) };
    },

    async getById(id) {
      if (API_CONFIG.useBackendApi) {
        const res = await apiRequest(`/sales/${id}`);
        if (res.success) return { success: true, data: res.data };
      }
      await delay();
      const sale = StorageService.findById(STORAGE_KEYS.SALES, id);
      if (!sale) return { success: false, error: "Sales invoice not found" };
      return { success: true, data: sale };
    },

    async create(salesData) {
      if (API_CONFIG.useBackendApi) {
        const res = await apiRequest('/sales', {
          method: 'POST',
          body: JSON.stringify(salesData)
        });
        if (res.success) return { success: true, data: res.data };
        return { success: false, error: res.error };
      }

      await delay();
      if (!salesData.items || salesData.items.length === 0) {
        return { success: false, error: "Sales invoice must contain at least one product item" };
      }

      const products = StorageService.getCollection(STORAGE_KEYS.PRODUCTS);
      for (const item of salesData.items) {
        const prod = products.find(p => p._id === item.productId);
        if (!prod) return { success: false, error: `Product not found: ${item.productName}` };
        const reqQty = Number(item.quantity) || 0;
        if (prod.stockQuantity < reqQty) {
          return {
            success: false,
            error: `Insufficient stock for '${prod.name}'. Available: ${prod.stockQuantity}, Requested: ${reqQty}`
          };
        }
      }

      const invoiceNumber = salesData.invoiceNumber || `INV-2026-${String(Date.now()).slice(-4)}`;
      const timestamp = new Date().toISOString();

      const newSale = {
        ...salesData,
        invoiceNumber,
        status: salesData.status || "Completed",
        createdAt: timestamp
      };

      const created = StorageService.insert(STORAGE_KEYS.SALES, newSale);

      for (const item of salesData.items) {
        const prodIndex = products.findIndex(p => p._id === item.productId);
        if (prodIndex !== -1) {
          const prod = products[prodIndex];
          const prevStock = prod.stockQuantity;
          const soldQty = Number(item.quantity) || 0;
          const newStock = prevStock - soldQty;

          let status = 'in_stock';
          if (newStock === 0) status = 'out_of_stock';
          else if (newStock <= prod.minStockLevel) status = 'low_stock';

          prod.stockQuantity = newStock;
          prod.status = status;

          StorageService.insert(STORAGE_KEYS.STOCK_TRANSACTIONS, {
            productId: prod._id,
            productName: prod.name,
            sku: prod.sku,
            type: "SALE",
            quantity: -soldQty,
            previousStock: prevStock,
            newStock: newStock,
            referenceId: invoiceNumber,
            notes: `Sold to ${salesData.customerName || 'Walk-in Customer'}`,
            timestamp
          });
        }
      }
      StorageService.saveCollection(STORAGE_KEYS.PRODUCTS, products);
      return { success: true, data: created };
    }
  },

  // 7. Inventory Controller (/api/inventory)
  inventory: {
    async getStockList(filter = 'all') {
      if (API_CONFIG.useBackendApi) {
        if (filter === 'low' || filter === 'out') {
          const res = await apiRequest('/inventory/low-stock');
          if (res.success) {
            return {
              success: true,
              data: filter === 'out' ? res.data.filter(p => p.stockQuantity === 0) : res.data
            };
          }
        } else {
          const res = await apiRequest('/products');
          if (res.success) return { success: true, data: res.data };
        }
      }

      await delay();
      let products = StorageService.getCollection(STORAGE_KEYS.PRODUCTS);
      if (filter === 'low') products = products.filter(p => p.status === 'low_stock');
      else if (filter === 'out') products = products.filter(p => p.status === 'out_of_stock');
      return { success: true, data: products };
    },

    async getTransactions() {
      if (API_CONFIG.useBackendApi) {
        const res = await apiRequest('/inventory/transactions');
        if (res.success) return { success: true, data: res.data };
      }
      await delay();
      return { success: true, data: StorageService.getCollection(STORAGE_KEYS.STOCK_TRANSACTIONS) };
    },

    async adjustStock(productId, adjustmentType, quantity, reason, notes = '') {
      if (API_CONFIG.useBackendApi) {
        const res = await apiRequest('/inventory/adjust', {
          method: 'POST',
          body: JSON.stringify({
            productId,
            adjustmentType,
            quantity: Number(quantity),
            reason,
            notes
          })
        });
        if (res.success) return { success: true, data: res.data };
        return { success: false, error: res.error };
      }

      await delay();
      const products = StorageService.getCollection(STORAGE_KEYS.PRODUCTS);
      const prodIndex = products.findIndex(p => p._id === productId);
      if (prodIndex === -1) return { success: false, error: "Product not found" };

      const prod = products[prodIndex];
      const prevStock = prod.stockQuantity;
      const change = Number(quantity);

      let newStock = prevStock;
      let transactionType = 'ADJUSTMENT_ADD';

      if (adjustmentType === 'add') {
        newStock = prevStock + change;
        transactionType = 'ADJUSTMENT_ADD';
      } else if (adjustmentType === 'subtract') {
        if (prevStock < change) {
          return {
            success: false,
            error: `Cannot reduce by ${change}. Current stock is only ${prevStock}. Negative stock is prohibited.`
          };
        }
        newStock = prevStock - change;
        transactionType = 'ADJUSTMENT_SUBTRACT';
      } else if (adjustmentType === 'set') {
        if (change < 0) return { success: false, error: "Stock count cannot be negative" };
        newStock = change;
        transactionType = newStock >= prevStock ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_SUBTRACT';
      }

      let status = 'in_stock';
      if (newStock === 0) status = 'out_of_stock';
      else if (newStock <= prod.minStockLevel) status = 'low_stock';

      prod.stockQuantity = newStock;
      prod.status = status;
      StorageService.saveCollection(STORAGE_KEYS.PRODUCTS, products);

      const tx = StorageService.insert(STORAGE_KEYS.STOCK_TRANSACTIONS, {
        productId: prod._id,
        productName: prod.name,
        sku: prod.sku,
        type: transactionType,
        quantity: newStock - prevStock,
        previousStock: prevStock,
        newStock: newStock,
        referenceId: reason || "Manual Adjustment",
        notes: notes || `Stock updated via inventory adjustment (${reason})`,
        timestamp: new Date().toISOString()
      });

      return { success: true, data: { product: prod, transaction: tx } };
    }
  },

  // 8. Dashboard Controller (/api/dashboard)
  dashboard: {
    async getSummary() {
      if (API_CONFIG.useBackendApi) {
        const res = await apiRequest('/dashboard/summary');
        if (res.success) return { success: true, data: res.data };
      }
      return null;
    },

    async getSalesOverview() {
      if (API_CONFIG.useBackendApi) {
        const res = await apiRequest('/dashboard/sales-overview');
        if (res.success) return { success: true, data: res.data };
      }
      return null;
    }
  },

  // 9. Reports Controller (/api/reports)
  reports: {
    async getSummary(dateRange = 'all') {
      if (API_CONFIG.useBackendApi) {
        const res = await apiRequest(`/reports/summary?timeframe=${dateRange}`);
        if (res.success) {
          const d = res.data;
          return {
            success: true,
            data: {
              totalSalesCount: d.sales?.length || 0,
              totalPurchasesCount: d.purchases?.length || 0,
              totalSalesRevenue: d.profitSummary?.grossRevenue || 0,
              totalPurchasesCost: d.purchases?.reduce((s, p) => s + p.grandTotal, 0) || 0,
              cogs: d.profitSummary?.costOfGoodsSold || 0,
              estimatedProfit: d.profitSummary?.grossProfit || 0,
              profitMargin: d.profitSummary?.profitMarginPercentage || 0,
              totalInventoryValue: d.inventorySummary?.totalValuationAtCost || 0,
              totalRetailValue: d.inventorySummary?.potentialRevenueAtRetail || 0,
              totalAvailableUnits: d.inventorySummary?.totalQuantityOnHand || 0,
              productBreakdown: d.productBreakdown || [],
              sales: d.sales || [],
              purchases: d.purchases || []
            }
          };
        }
      }

      await delay();
      const sales = StorageService.getCollection(STORAGE_KEYS.SALES);
      const purchases = StorageService.getCollection(STORAGE_KEYS.PURCHASES);
      const products = StorageService.getCollection(STORAGE_KEYS.PRODUCTS);

      const now = new Date();
      let startDate = new Date(0);
      if (dateRange === 'today') startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      else if (dateRange === 'week') startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      else if (dateRange === 'month') startDate = new Date(now.getFullYear(), now.getMonth(), 1);

      const filteredSales = sales.filter(s => new Date(s.createdAt) >= startDate);
      const filteredPurchases = purchases.filter(p => new Date(p.createdAt) >= startDate);

      const totalSalesRevenue = filteredSales.reduce((acc, s) => acc + (s.grandTotal || 0), 0);
      const totalPurchasesCost = filteredPurchases.reduce((acc, p) => acc + (p.grandTotal || 0), 0);

      let cogs = 0;
      filteredSales.forEach(sale => {
        sale.items.forEach(item => {
          const prod = products.find(p => p._id === item.productId);
          const unitCost = prod ? prod.purchasePrice : (item.purchasePrice || 0);
          cogs += unitCost * item.quantity;
        });
      });

      const estimatedProfit = Math.max(0, totalSalesRevenue - cogs);
      const profitMargin = totalSalesRevenue > 0 ? ((estimatedProfit / totalSalesRevenue) * 100).toFixed(1) : 0;
      const totalInventoryValue = products.reduce((sum, p) => sum + (p.stockQuantity * p.purchasePrice), 0);
      const totalRetailValue = products.reduce((sum, p) => sum + (p.stockQuantity * p.sellingPrice), 0);
      const totalAvailableUnits = products.reduce((sum, p) => sum + p.stockQuantity, 0);

      const productStats = {};
      filteredSales.forEach(s => {
        s.items.forEach(it => {
          if (!productStats[it.productId]) {
            productStats[it.productId] = {
              productId: it.productId,
              name: it.productName,
              sku: it.sku,
              unitsSold: 0,
              revenue: 0,
              cost: 0
            };
          }
          const pRef = products.find(p => p._id === it.productId);
          const costPrice = pRef ? pRef.purchasePrice : 0;
          productStats[it.productId].unitsSold += it.quantity;
          productStats[it.productId].revenue += it.total || (it.sellingPrice * it.quantity);
          productStats[it.productId].cost += (costPrice * it.quantity);
        });
      });

      const productSalesArray = Object.values(productStats).map(p => ({
        ...p,
        profit: p.revenue - p.cost,
        margin: p.revenue > 0 ? (((p.revenue - p.cost) / p.revenue) * 100).toFixed(1) : 0
      })).sort((a, b) => b.revenue - a.revenue);

      return {
        success: true,
        data: {
          totalSalesCount: filteredSales.length,
          totalPurchasesCount: filteredPurchases.length,
          totalSalesRevenue,
          totalPurchasesCost,
          cogs,
          estimatedProfit,
          profitMargin,
          totalInventoryValue,
          totalRetailValue,
          totalAvailableUnits,
          productBreakdown: productSalesArray,
          sales: filteredSales,
          purchases: filteredPurchases
        }
      };
    }
  },

  // 10. Settings Controller (/api/settings)
  settings: {
    async get() {
      await delay(10);
      const s = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return { success: true, data: s ? JSON.parse(s) : DEFAULT_SETTINGS };
    },

    async update(updates) {
      await delay(10);
      const current = (await this.get()).data;
      const updated = { ...current, ...updates };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      return { success: true, data: updated };
    }
  }
};

window.api = api;
window.API_CONFIG = API_CONFIG;
window.apiRequest = apiRequest;
