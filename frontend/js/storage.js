/**
 * Smart Inventory Management System - Storage Service
 * LocalStorage layer compatible with future MongoDB Atlas collections.
 * Uses realistic Indian business sample data with INR currency (₹).
 */

const STORAGE_KEYS = {
  USERS: 'sims_users',
  PRODUCTS: 'sims_products',
  CATEGORIES: 'sims_categories',
  SUPPLIERS: 'sims_suppliers',
  PURCHASES: 'sims_purchases',
  SALES: 'sims_sales',
  STOCK_TRANSACTIONS: 'sims_stock_transactions',
  SETTINGS: 'sims_settings',
  CURRENT_USER: 'sims_current_user',
  THEME: 'sims_theme'
};

// Utilities
function generateId() {
  return 'id_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

function formatINR(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(num);
}

function formatDate(dateInput) {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function formatDateTime(dateInput) {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Initial Seed Data
const DEFAULT_SETTINGS = {
  companyName: "Bharat Smart Logistics & Retail Pvt Ltd",
  tradeName: "SmartInventory India",
  gstin: "29AABCB1234F1Z8",
  phone: "+91 98450 12345",
  email: "support@smartinventory.in",
  address: "Plot 42, Electronics City Phase 1, Hosur Road",
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "560100",
  currencySymbol: "₹",
  defaultTaxRate: 18,
  lowStockThreshold: 10,
  theme: "light"
};

const DEFAULT_USERS = [
  {
    _id: "user_admin_01",
    name: "Rajesh Sharma",
    email: "admin@smartinventory.in",
    role: "System Administrator",
    companyName: "Bharat Smart Logistics & Retail Pvt Ltd",
    avatar: "RS",
    createdAt: "2026-01-10T10:00:00Z"
  }
];

const DEFAULT_CATEGORIES = [
  {
    _id: "cat_elec",
    name: "Electronics & Peripherals",
    code: "ELEC",
    description: "Audio accessories, power banks, computer hardware and network devices",
    icon: "headphones",
    createdAt: "2026-01-12T09:00:00Z"
  },
  {
    _id: "cat_home",
    name: "Home & Electricals",
    code: "HOME",
    description: "LED lighting, extension strips, kitchen appliances and wiring accessories",
    icon: "zap",
    createdAt: "2026-01-12T09:15:00Z"
  },
  {
    _id: "cat_fmcg",
    name: "FMCG & Packaged Goods",
    code: "FMCG",
    description: "Tea, packaged dry foods, confectionery and daily consumer goods",
    icon: "shopping-bag",
    createdAt: "2026-01-12T09:30:00Z"
  },
  {
    _id: "cat_stat",
    name: "Stationery & Office",
    code: "STAT",
    description: "Notebooks, printing paper, office writing essentials and desk supplies",
    icon: "book-open",
    createdAt: "2026-01-12T09:45:00Z"
  },
  {
    _id: "cat_hard",
    name: "Hardware & Security",
    code: "HARD",
    description: "Brass padlocks, security deadbolts, mounting kits and industrial tools",
    icon: "shield",
    createdAt: "2026-01-12T10:00:00Z"
  }
];

const DEFAULT_SUPPLIERS = [
  {
    _id: "sup_apex",
    name: "Suresh Menon",
    company: "Apex Electro-Tech Distributors",
    phone: "+91 80 2841 4000",
    email: "sales@apexelectro.in",
    gstin: "29AABCA5678D1Z2",
    address: "12/4 Industrial Area, Peenya 2nd Stage",
    city: "Bengaluru",
    state: "Karnataka",
    createdAt: "2026-01-15T11:00:00Z"
  },
  {
    _id: "sup_bharat",
    name: "Vikas Aggarwal",
    company: "Bharat Wholesale Electricals",
    phone: "+91 11 2386 7711",
    email: "orders@bharatelectrical.com",
    gstin: "07AAACB1234F1Z5",
    address: "Shop 45, Bhagirath Palace, Chandni Chowk",
    city: "Delhi",
    state: "Delhi",
    createdAt: "2026-01-15T11:30:00Z"
  },
  {
    _id: "sup_ganesh",
    name: "Nitin Patil",
    company: "Shree Ganesh Consumer Goods",
    phone: "+91 22 2344 8899",
    email: "contact@ganeshconsumer.in",
    gstin: "27AABCS3456G1Z9",
    address: "Gala 18, APMC Market-1, Turbhe",
    city: "Navi Mumbai",
    state: "Maharashtra",
    createdAt: "2026-01-15T12:00:00Z"
  },
  {
    _id: "sup_kaveri",
    name: "K. Ramanathan",
    company: "Kaveri Office Solutions & Supplies",
    phone: "+91 44 2538 9012",
    email: "dispatch@kaverioffice.com",
    gstin: "33AABCK9012E1Z8",
    address: "78 Armenian Street, George Town",
    city: "Chennai",
    state: "Tamil Nadu",
    createdAt: "2026-01-15T12:30:00Z"
  }
];

const DEFAULT_PRODUCTS = [
  {
    _id: "prod_01",
    name: "boAt Rockerz 450 Bluetooth On-Ear Headphone",
    sku: "ELEC-BOAT-450",
    description: "40mm dynamic drivers, 15 hours battery playback, Bluetooth v5.0 with mic",
    categoryId: "cat_elec",
    categoryName: "Electronics & Peripherals",
    supplierId: "sup_apex",
    supplierName: "Apex Electro-Tech Distributors",
    purchasePrice: 950,
    sellingPrice: 1499,
    stockQuantity: 42,
    minStockLevel: 10,
    unit: "pcs",
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=150&auto=format&fit=crop&q=80",
    status: "in_stock",
    createdAt: "2026-01-16T10:00:00Z"
  },
  {
    _id: "prod_02",
    name: "Philips 10W B22 LED Cool Day White Bulb (Pack of 4)",
    sku: "HOME-PHIL-10W",
    description: "Energy saving 1050 Lumens B22 base crystal white glare-free bulb",
    categoryId: "cat_home",
    categoryName: "Home & Electricals",
    supplierId: "sup_bharat",
    supplierName: "Bharat Wholesale Electricals",
    purchasePrice: 280,
    sellingPrice: 449,
    stockQuantity: 110,
    minStockLevel: 25,
    unit: "pack",
    imageUrl: "https://images.unsplash.com/photo-1550985616-10810253b84d?w=150&auto=format&fit=crop&q=80",
    status: "in_stock",
    createdAt: "2026-01-16T10:20:00Z"
  },
  {
    _id: "prod_03",
    name: "Tata Tea Gold 500g Fresh Aroma Jar",
    sku: "FMCG-TATA-500",
    description: "Exquisite tea blend of Assam CTC teas with 15% gently rolled long leaves",
    categoryId: "cat_fmcg",
    categoryName: "FMCG & Packaged Goods",
    supplierId: "sup_ganesh",
    supplierName: "Shree Ganesh Consumer Goods",
    purchasePrice: 255,
    sellingPrice: 340,
    stockQuantity: 58,
    minStockLevel: 15,
    unit: "jar",
    imageUrl: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=150&auto=format&fit=crop&q=80",
    status: "in_stock",
    createdAt: "2026-01-16T10:40:00Z"
  },
  {
    _id: "prod_04",
    name: "Syska Power Pro 20,000mAh Dual USB Power Bank",
    sku: "ELEC-SYSK-20K",
    description: "High-density Li-Polymer battery with 18W fast charging and LED charge indicator",
    categoryId: "cat_elec",
    categoryName: "Electronics & Peripherals",
    supplierId: "sup_apex",
    supplierName: "Apex Electro-Tech Distributors",
    purchasePrice: 1100,
    sellingPrice: 1799,
    stockQuantity: 6,
    minStockLevel: 12,
    unit: "pcs",
    imageUrl: "https://images.unsplash.com/photo-1609592424364-ffb4c8104d49?w=150&auto=format&fit=crop&q=80",
    status: "low_stock",
    createdAt: "2026-01-16T11:00:00Z"
  },
  {
    _id: "prod_05",
    name: "Havells 4-Way Power Strip Surge Protector (2m Cord)",
    sku: "HOME-HAVE-4WAY",
    description: "Universal sockets with thermal trip surge protection and master switch",
    categoryId: "cat_home",
    categoryName: "Home & Electricals",
    supplierId: "sup_bharat",
    supplierName: "Bharat Wholesale Electricals",
    purchasePrice: 430,
    sellingPrice: 699,
    stockQuantity: 28,
    minStockLevel: 10,
    unit: "pcs",
    imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=150&auto=format&fit=crop&q=80",
    status: "in_stock",
    createdAt: "2026-01-16T11:20:00Z"
  },
  {
    _id: "prod_06",
    name: "Classmate Pulse Spiral Bound Notebook (6-Pack)",
    sku: "STAT-CLAS-PULS",
    description: "Single line 300 pages each, elemental chlorine-free paper with poly-cover",
    categoryId: "cat_stat",
    categoryName: "Stationery & Office",
    supplierId: "sup_kaveri",
    supplierName: "Kaveri Office Solutions & Supplies",
    purchasePrice: 210,
    sellingPrice: 360,
    stockQuantity: 74,
    minStockLevel: 20,
    unit: "pack",
    imageUrl: "https://images.unsplash.com/photo-1544716278-e513176f20b5?w=150&auto=format&fit=crop&q=80",
    status: "in_stock",
    createdAt: "2026-01-16T11:40:00Z"
  },
  {
    _id: "prod_07",
    name: "Godrej Nav-Tal 7-Lever Solid Brass Padlock (65mm)",
    sku: "HARD-GODR-65MM",
    description: "Rust-resistant brass body with hardened steel electroplated shackle & 3 keys",
    categoryId: "cat_hard",
    categoryName: "Hardware & Security",
    supplierId: "sup_bharat",
    supplierName: "Bharat Wholesale Electricals",
    purchasePrice: 390,
    sellingPrice: 590,
    stockQuantity: 4,
    minStockLevel: 10,
    unit: "pcs",
    imageUrl: "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=150&auto=format&fit=crop&q=80",
    status: "low_stock",
    createdAt: "2026-01-16T12:00:00Z"
  },
  {
    _id: "prod_08",
    name: "D-Link DGS-1008A 8-Port Gigabit Desktop Switch",
    sku: "ELEC-DLIN-8PORT",
    description: "8 Gigabit Ethernet ports with green Ethernet technology and fanless quiet build",
    categoryId: "cat_elec",
    categoryName: "Electronics & Peripherals",
    supplierId: "sup_apex",
    supplierName: "Apex Electro-Tech Distributors",
    purchasePrice: 1250,
    sellingPrice: 1950,
    stockQuantity: 0,
    minStockLevel: 6,
    unit: "pcs",
    imageUrl: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=150&auto=format&fit=crop&q=80",
    status: "out_of_stock",
    createdAt: "2026-01-16T12:20:00Z"
  },
  {
    _id: "prod_09",
    name: "Pigeon Cruise 1800W Induction Cooktop",
    sku: "HOME-PIGE-1800",
    description: "7 segment LED display, auto switch off, 93% energy saving technology",
    categoryId: "cat_home",
    categoryName: "Home & Electricals",
    supplierId: "sup_bharat",
    supplierName: "Bharat Wholesale Electricals",
    purchasePrice: 1520,
    sellingPrice: 2499,
    stockQuantity: 18,
    minStockLevel: 5,
    unit: "pcs",
    imageUrl: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=150&auto=format&fit=crop&q=80",
    status: "in_stock",
    createdAt: "2026-01-16T12:40:00Z"
  },
  {
    _id: "prod_10",
    name: "Cadbury Celebrations Rich Dry Fruit Gift Pack (500g)",
    sku: "FMCG-CADB-DF500",
    description: "Almonds, cashews and raisins covered in rich chocolate confectionery",
    categoryId: "cat_fmcg",
    categoryName: "FMCG & Packaged Goods",
    supplierId: "sup_ganesh",
    supplierName: "Shree Ganesh Consumer Goods",
    purchasePrice: 320,
    sellingPrice: 499,
    stockQuantity: 36,
    minStockLevel: 10,
    unit: "box",
    imageUrl: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=150&auto=format&fit=crop&q=80",
    status: "in_stock",
    createdAt: "2026-01-16T13:00:00Z"
  }
];

const DEFAULT_PURCHASES = [
  {
    _id: "po_1001",
    invoiceNumber: "PUR-2026-001",
    supplierId: "sup_apex",
    supplierName: "Apex Electro-Tech Distributors",
    items: [
      {
        productId: "prod_01",
        productName: "boAt Rockerz 450 Bluetooth On-Ear Headphone",
        sku: "ELEC-BOAT-450",
        quantity: 50,
        purchasePrice: 950,
        total: 47500
      },
      {
        productId: "prod_04",
        productName: "Syska Power Pro 20,000mAh Dual USB Power Bank",
        sku: "ELEC-SYSK-20K",
        quantity: 20,
        purchasePrice: 1100,
        total: 22000
      }
    ],
    subtotal: 69500,
    taxRate: 18,
    taxAmount: 12510,
    discount: 1500,
    grandTotal: 80510,
    paymentMethod: "Bank Transfer (NEFT)",
    status: "Completed",
    notes: "Consignment received in intact condition at Peenya warehouse.",
    createdAt: "2026-02-05T14:30:00Z"
  },
  {
    _id: "po_1002",
    invoiceNumber: "PUR-2026-002",
    supplierId: "sup_bharat",
    supplierName: "Bharat Wholesale Electricals",
    items: [
      {
        productId: "prod_02",
        productName: "Philips 10W B22 LED Cool Day White Bulb (Pack of 4)",
        sku: "HOME-PHIL-10W",
        quantity: 120,
        purchasePrice: 280,
        total: 33600
      },
      {
        productId: "prod_05",
        productName: "Havells 4-Way Power Strip Surge Protector (2m Cord)",
        sku: "HOME-HAVE-4WAY",
        quantity: 40,
        purchasePrice: 430,
        total: 17200
      },
      {
        productId: "prod_09",
        productName: "Pigeon Cruise 1800W Induction Cooktop",
        sku: "HOME-PIGE-1800",
        quantity: 25,
        purchasePrice: 1520,
        total: 38000
      }
    ],
    subtotal: 88800,
    taxRate: 18,
    taxAmount: 15984,
    discount: 2000,
    grandTotal: 102784,
    paymentMethod: "RTGS",
    status: "Completed",
    notes: "Monthly wholesale procurement consignment.",
    createdAt: "2026-02-12T16:00:00Z"
  },
  {
    _id: "po_1003",
    invoiceNumber: "PUR-2026-003",
    supplierId: "sup_ganesh",
    supplierName: "Shree Ganesh Consumer Goods",
    items: [
      {
        productId: "prod_03",
        productName: "Tata Tea Gold 500g Fresh Aroma Jar",
        sku: "FMCG-TATA-500",
        quantity: 70,
        purchasePrice: 255,
        total: 17850
      },
      {
        productId: "prod_10",
        productName: "Cadbury Celebrations Rich Dry Fruit Gift Pack (500g)",
        sku: "FMCG-CADB-DF500",
        quantity: 50,
        purchasePrice: 320,
        total: 16000
      }
    ],
    subtotal: 33850,
    taxRate: 5,
    taxAmount: 1692.5,
    discount: 500,
    grandTotal: 35042.5,
    paymentMethod: "Cheque",
    status: "Completed",
    notes: "Confectionery stock for festive inventory buffer.",
    createdAt: "2026-02-18T11:15:00Z"
  }
];

const DEFAULT_SALES = [
  {
    _id: "inv_2001",
    invoiceNumber: "INV-2026-001",
    customerName: "Venkateshwara Mart",
    customerPhone: "+91 94481 22334",
    customerEmail: "orders@venkatmart.com",
    items: [
      {
        productId: "prod_01",
        productName: "boAt Rockerz 450 Bluetooth On-Ear Headphone",
        sku: "ELEC-BOAT-450",
        quantity: 6,
        sellingPrice: 1499,
        total: 8994
      },
      {
        productId: "prod_04",
        productName: "Syska Power Pro 20,000mAh Dual USB Power Bank",
        sku: "ELEC-SYSK-20K",
        quantity: 8,
        sellingPrice: 1799,
        total: 14392
      }
    ],
    subtotal: 23386,
    taxRate: 18,
    taxAmount: 4209.48,
    discount: 595.48,
    grandTotal: 27000,
    paymentMethod: "UPI",
    status: "Completed",
    notes: "Paid via PhonePe QR code.",
    createdAt: "2026-02-10T11:45:00Z"
  },
  {
    _id: "inv_2002",
    invoiceNumber: "INV-2026-002",
    customerName: "City Retail Supermarket",
    customerPhone: "+91 98200 44556",
    customerEmail: "accounts@cityretail.in",
    items: [
      {
        productId: "prod_02",
        productName: "Philips 10W B22 LED Cool Day White Bulb (Pack of 4)",
        sku: "HOME-PHIL-10W",
        quantity: 10,
        sellingPrice: 449,
        total: 4490
      },
      {
        productId: "prod_05",
        productName: "Havells 4-Way Power Strip Surge Protector (2m Cord)",
        sku: "HOME-HAVE-4WAY",
        quantity: 8,
        sellingPrice: 699,
        total: 5592
      },
      {
        productId: "prod_09",
        productName: "Pigeon Cruise 1800W Induction Cooktop",
        sku: "HOME-PIGE-1800",
        quantity: 5,
        sellingPrice: 2499,
        total: 12495
      }
    ],
    subtotal: 22577,
    taxRate: 18,
    taxAmount: 4063.86,
    discount: 640.86,
    grandTotal: 26000,
    paymentMethod: "Net Banking",
    status: "Completed",
    notes: "HDFC corporate direct transfer.",
    createdAt: "2026-02-14T15:20:00Z"
  },
  {
    _id: "inv_2003",
    invoiceNumber: "INV-2026-003",
    customerName: "Ananya Enterprises",
    customerPhone: "+91 99112 88771",
    customerEmail: "info@ananyabiz.org",
    items: [
      {
        productId: "prod_03",
        productName: "Tata Tea Gold 500g Fresh Aroma Jar",
        sku: "FMCG-TATA-500",
        quantity: 12,
        sellingPrice: 340,
        total: 4080
      },
      {
        productId: "prod_10",
        productName: "Cadbury Celebrations Rich Dry Fruit Gift Pack (500g)",
        sku: "FMCG-CADB-DF500",
        quantity: 14,
        sellingPrice: 499,
        total: 6986
      }
    ],
    subtotal: 11066,
    taxRate: 5,
    taxAmount: 553.3,
    discount: 119.3,
    grandTotal: 11500,
    paymentMethod: "Credit Card",
    status: "Completed",
    notes: "Corporate gifting dispatch.",
    createdAt: "2026-02-22T17:10:00Z"
  }
];

const DEFAULT_TRANSACTIONS = [
  {
    _id: "tx_01",
    productId: "prod_01",
    productName: "boAt Rockerz 450 Bluetooth On-Ear Headphone",
    sku: "ELEC-BOAT-450",
    type: "PURCHASE",
    quantity: 50,
    previousStock: 0,
    newStock: 50,
    referenceId: "PUR-2026-001",
    notes: "Initial purchase consignment inward",
    timestamp: "2026-02-05T14:30:00Z"
  },
  {
    _id: "tx_02",
    productId: "prod_01",
    productName: "boAt Rockerz 450 Bluetooth On-Ear Headphone",
    sku: "ELEC-BOAT-450",
    type: "SALE",
    quantity: -6,
    previousStock: 50,
    newStock: 44,
    referenceId: "INV-2026-001",
    notes: "Sale invoice to Venkateshwara Mart",
    timestamp: "2026-02-10T11:45:00Z"
  },
  {
    _id: "tx_03",
    productId: "prod_01",
    productName: "boAt Rockerz 450 Bluetooth On-Ear Headphone",
    sku: "ELEC-BOAT-450",
    type: "ADJUSTMENT_SUBTRACT",
    quantity: -2,
    previousStock: 44,
    newStock: 42,
    referenceId: "Damaged Goods",
    notes: "Physical box crushed during internal handling",
    timestamp: "2026-02-12T10:00:00Z"
  },
  {
    _id: "tx_04",
    productId: "prod_04",
    productName: "Syska Power Pro 20,000mAh Dual USB Power Bank",
    sku: "ELEC-SYSK-20K",
    type: "PURCHASE",
    quantity: 20,
    previousStock: 0,
    newStock: 20,
    referenceId: "PUR-2026-001",
    notes: "Purchase shipment received",
    timestamp: "2026-02-05T14:30:00Z"
  },
  {
    _id: "tx_05",
    productId: "prod_04",
    productName: "Syska Power Pro 20,000mAh Dual USB Power Bank",
    sku: "ELEC-SYSK-20K",
    type: "SALE",
    quantity: -8,
    previousStock: 20,
    newStock: 12,
    referenceId: "INV-2026-001",
    notes: "Customer dispatch",
    timestamp: "2026-02-10T11:45:00Z"
  },
  {
    _id: "tx_06",
    productId: "prod_04",
    productName: "Syska Power Pro 20,000mAh Dual USB Power Bank",
    sku: "ELEC-SYSK-20K",
    type: "ADJUSTMENT_SUBTRACT",
    quantity: -6,
    previousStock: 12,
    newStock: 6,
    referenceId: "Supplier Return",
    notes: "Returned to supplier for testing battery defect",
    timestamp: "2026-02-15T09:30:00Z"
  }
];

class StorageService {
  static init() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      this.resetToDefaults();
    }
  }

  static resetToDefaults() {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(DEFAULT_SUPPLIERS));
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(DEFAULT_PURCHASES));
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(DEFAULT_SALES));
    localStorage.setItem(STORAGE_KEYS.STOCK_TRANSACTIONS, JSON.stringify(DEFAULT_TRANSACTIONS));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(DEFAULT_USERS[0]));
    localStorage.setItem(STORAGE_KEYS.THEME, 'light');
  }

  static getCollection(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error(`Error reading ${key} from localStorage`, e);
      return [];
    }
  }

  static saveCollection(key, items) {
    try {
      localStorage.setItem(key, JSON.stringify(items));
      return true;
    } catch (e) {
      console.error(`Error saving ${key} to localStorage`, e);
      return false;
    }
  }

  static findById(key, id) {
    const items = this.getCollection(key);
    return items.find(item => item._id === id) || null;
  }

  static insert(key, item) {
    const items = this.getCollection(key);
    if (!item._id) {
      item._id = generateId();
    }
    if (!item.createdAt) {
      item.createdAt = new Date().toISOString();
    }
    items.unshift(item);
    this.saveCollection(key, items);
    return item;
  }

  static update(key, id, updates) {
    const items = this.getCollection(key);
    const index = items.findIndex(item => item._id === id);
    if (index === -1) return null;
    items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
    this.saveCollection(key, items);
    return items[index];
  }

  static delete(key, id) {
    const items = this.getCollection(key);
    const filtered = items.filter(item => item._id !== id);
    if (filtered.length !== items.length) {
      this.saveCollection(key, filtered);
      return true;
    }
    return false;
  }

  static exportJSON() {
    const backup = {};
    Object.values(STORAGE_KEYS).forEach(k => {
      backup[k] = this.getCollection(k);
    });
    return JSON.stringify(backup, null, 2);
  }

  static importJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      Object.entries(data).forEach(([k, v]) => {
        localStorage.setItem(k, JSON.stringify(v));
      });
      return true;
    } catch (e) {
      console.error('Invalid JSON imported', e);
      return false;
    }
  }
}

// Auto-initialize on script load
StorageService.init();

// Export globals for vanilla JS modules
window.STORAGE_KEYS = STORAGE_KEYS;
window.StorageService = StorageService;
window.generateId = generateId;
window.formatINR = formatINR;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
