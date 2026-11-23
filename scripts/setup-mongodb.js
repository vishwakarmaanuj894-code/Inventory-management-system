/**
 * MongoDB Atlas Setup and Seeder Script
 * Connects to live MongoDB Atlas cluster, configures collections,
 * ensures unique indexes, and seeds realistic Indian inventory data.
 */

import { MongoClient, ObjectId, Decimal128 } from 'mongodb';
import bcrypt from 'bcryptjs';

const CONNECTION_STRING = "mongodb+srv://vishwakarmaanuj757_db_user:jE8eiV6HNVwnTtu5@cluster0.t9lexa7.mongodb.net/?retryWrites=true&w=majority&appName=SmartInventoryCluster";
const DATABASE_NAME = "SmartInventoryDb";

async function run() {
  console.log("=================================================");
  console.log("  SMART INVENTORY SYSTEM - MONGODB ATLAS SETUP   ");
  console.log("=================================================");
  console.log(`Connecting to MongoDB Atlas Cluster: cluster0.t9lexa7.mongodb.net`);
  console.log(`Target Database: ${DATABASE_NAME}`);

  const client = new MongoClient(CONNECTION_STRING, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000
  });

  try {
    await client.connect();
    console.log("✓ Successfully connected to MongoDB Atlas!");

    const db = client.db(DATABASE_NAME);

    // 1. Setup Collections and Indexes
    console.log("\n[1/4] Configuring Collections & Indexes...");

    // Collections
    const usersCol = db.collection("users");
    const categoriesCol = db.collection("categories");
    const suppliersCol = db.collection("suppliers");
    const productsCol = db.collection("products");
    const purchasesCol = db.collection("purchases");
    const salesCol = db.collection("sales");
    const stockTransactionsCol = db.collection("stockTransactions");

    // Indexes
    await usersCol.createIndex({ email: 1 }, { unique: true, name: "idx_users_email_unique" });
    console.log("  ✓ Created unique index on users.email");

    await categoriesCol.createIndex({ name: 1 }, { unique: true, name: "idx_categories_name_unique" });
    console.log("  ✓ Created unique index on categories.name");

    await productsCol.createIndex({ sku: 1 }, { unique: true, name: "idx_products_sku_unique" });
    console.log("  ✓ Created unique index on products.sku");

    await purchasesCol.createIndex({ invoiceNumber: 1 }, { unique: true, name: "idx_purchases_invoice_unique" });
    console.log("  ✓ Created unique index on purchases.invoiceNumber");

    await salesCol.createIndex({ invoiceNumber: 1 }, { unique: true, name: "idx_sales_invoice_unique" });
    console.log("  ✓ Created unique index on sales.invoiceNumber");

    await stockTransactionsCol.createIndex({ productId: 1, timestamp: -1 }, { name: "idx_stock_trans_prod_time" });
    console.log("  ✓ Created composite index on stockTransactions (productId, timestamp)");

    // 2. Prepare Seed Data with Valid ObjectIds
    console.log("\n[2/4] Generating Seed Documents & BCrypt Hashes...");

    // Admin user
    const salt = bcrypt.genSaltSync(10);
    const adminPasswordHash = bcrypt.hashSync("admin123", salt);

    const adminUserId = new ObjectId();
    const usersData = [
      {
        _id: adminUserId,
        name: "Rajesh Sharma",
        email: "admin@smartinventory.in",
        passwordHash: adminPasswordHash,
        role: "Administrator",
        companyName: "Bharat Smart Logistics & Retail Pvt Ltd",
        avatar: "RS",
        isActive: true,
        createdAt: new Date("2026-01-10T10:00:00Z"),
        lastLoginAt: new Date()
      },
      {
        _id: new ObjectId(),
        name: "Priya Sundaram",
        email: "priya.s@smartinventory.in",
        passwordHash: adminPasswordHash,
        role: "InventoryManager",
        companyName: "Bharat Smart Logistics & Retail Pvt Ltd",
        avatar: "PS",
        isActive: true,
        createdAt: new Date("2026-01-15T11:00:00Z"),
        lastLoginAt: null
      }
    ];

    // Categories
    const catElecId = new ObjectId();
    const catHomeId = new ObjectId();
    const catFmcgId = new ObjectId();
    const catStatId = new ObjectId();
    const catHardId = new ObjectId();

    const categoriesData = [
      {
        _id: catElecId,
        name: "Electronics & Peripherals",
        code: "ELEC",
        description: "Audio accessories, power banks, computer hardware and network devices",
        icon: "headphones",
        createdAt: new Date("2026-01-12T09:00:00Z"),
        updatedAt: null
      },
      {
        _id: catHomeId,
        name: "Home & Electricals",
        code: "HOME",
        description: "LED lighting, extension strips, kitchen appliances and wiring accessories",
        icon: "zap",
        createdAt: new Date("2026-01-12T09:15:00Z"),
        updatedAt: null
      },
      {
        _id: catFmcgId,
        name: "FMCG & Packaged Goods",
        code: "FMCG",
        description: "Tea, packaged dry foods, confectionery and daily consumer goods",
        icon: "shopping-bag",
        createdAt: new Date("2026-01-12T09:30:00Z"),
        updatedAt: null
      },
      {
        _id: catStatId,
        name: "Stationery & Office",
        code: "STAT",
        description: "Notebooks, printing paper, office writing essentials and desk supplies",
        icon: "book-open",
        createdAt: new Date("2026-01-12T09:45:00Z"),
        updatedAt: null
      },
      {
        _id: catHardId,
        name: "Hardware & Security",
        code: "HARD",
        description: "Brass padlocks, security deadbolts, mounting kits and industrial tools",
        icon: "shield",
        createdAt: new Date("2026-01-12T10:00:00Z"),
        updatedAt: null
      }
    ];

    // Suppliers
    const supApexId = new ObjectId();
    const supBharatId = new ObjectId();
    const supGaneshId = new ObjectId();
    const supKaveriId = new ObjectId();

    const suppliersData = [
      {
        _id: supApexId,
        name: "Suresh Menon",
        company: "Apex Electro-Tech Distributors",
        phone: "+91 80 2841 4000",
        email: "sales@apexelectro.in",
        gstin: "29AABCA5678D1Z2",
        address: "12/4 Industrial Area, Peenya 2nd Stage",
        city: "Bengaluru",
        state: "Karnataka",
        createdAt: new Date("2026-01-15T11:00:00Z"),
        updatedAt: null
      },
      {
        _id: supBharatId,
        name: "Vikas Aggarwal",
        company: "Bharat Wholesale Electricals",
        phone: "+91 11 2386 7711",
        email: "orders@bharatelectrical.com",
        gstin: "07AAACB1234F1Z5",
        address: "Shop 45, Bhagirath Palace, Chandni Chowk",
        city: "Delhi",
        state: "Delhi",
        createdAt: new Date("2026-01-15T11:30:00Z"),
        updatedAt: null
      },
      {
        _id: supGaneshId,
        name: "Nitin Patil",
        company: "Shree Ganesh Consumer Goods",
        phone: "+91 22 2344 8899",
        email: "contact@ganeshconsumer.in",
        gstin: "27AABCS3456G1Z9",
        address: "Gala 18, APMC Market-1, Turbhe",
        city: "Navi Mumbai",
        state: "Maharashtra",
        createdAt: new Date("2026-01-15T12:00:00Z"),
        updatedAt: null
      },
      {
        _id: supKaveriId,
        name: "K. Ramanathan",
        company: "Kaveri Office Solutions & Supplies",
        phone: "+91 44 2538 9012",
        email: "dispatch@kaverioffice.com",
        gstin: "33AABCK9012E1Z8",
        address: "78 Armenian Street, George Town",
        city: "Chennai",
        state: "Tamil Nadu",
        createdAt: new Date("2026-01-15T12:30:00Z"),
        updatedAt: null
      }
    ];

    // Products
    const prod01Id = new ObjectId();
    const prod02Id = new ObjectId();
    const prod03Id = new ObjectId();
    const prod04Id = new ObjectId();
    const prod05Id = new ObjectId();
    const prod06Id = new ObjectId();
    const prod07Id = new ObjectId();
    const prod08Id = new ObjectId();
    const prod09Id = new ObjectId();
    const prod10Id = new ObjectId();

    const productsData = [
      {
        _id: prod01Id,
        name: "boAt Rockerz 450 Bluetooth On-Ear Headphone",
        sku: "ELEC-BOAT-450",
        description: "40mm dynamic drivers, 15 hours battery playback, Bluetooth v5.0 with mic",
        categoryId: catElecId,
        categoryName: "Electronics & Peripherals",
        supplierId: supApexId,
        supplierName: "Apex Electro-Tech Distributors",
        purchasePrice: Decimal128.fromString("950.00"),
        sellingPrice: Decimal128.fromString("1499.00"),
        stockQuantity: 42,
        minStockLevel: 10,
        unit: "pcs",
        imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=150&auto=format&fit=crop&q=80",
        status: "in_stock",
        createdAt: new Date("2026-01-16T10:00:00Z"),
        updatedAt: null
      },
      {
        _id: prod02Id,
        name: "Philips 10W B22 LED Cool Day White Bulb (Pack of 4)",
        sku: "HOME-PHIL-10W",
        description: "Energy saving 1050 Lumens B22 base crystal white glare-free bulb",
        categoryId: catHomeId,
        categoryName: "Home & Electricals",
        supplierId: supBharatId,
        supplierName: "Bharat Wholesale Electricals",
        purchasePrice: Decimal128.fromString("280.00"),
        sellingPrice: Decimal128.fromString("449.00"),
        stockQuantity: 110,
        minStockLevel: 25,
        unit: "pack",
        imageUrl: "https://images.unsplash.com/photo-1550985616-10810253b84d?w=150&auto=format&fit=crop&q=80",
        status: "in_stock",
        createdAt: new Date("2026-01-16T10:20:00Z"),
        updatedAt: null
      },
      {
        _id: prod03Id,
        name: "Tata Tea Gold 500g Fresh Aroma Jar",
        sku: "FMCG-TATA-500",
        description: "Exquisite tea blend of Assam CTC teas with 15% gently rolled long leaves",
        categoryId: catFmcgId,
        categoryName: "FMCG & Packaged Goods",
        supplierId: supGaneshId,
        supplierName: "Shree Ganesh Consumer Goods",
        purchasePrice: Decimal128.fromString("255.00"),
        sellingPrice: Decimal128.fromString("340.00"),
        stockQuantity: 58,
        minStockLevel: 15,
        unit: "jar",
        imageUrl: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=150&auto=format&fit=crop&q=80",
        status: "in_stock",
        createdAt: new Date("2026-01-16T10:40:00Z"),
        updatedAt: null
      },
      {
        _id: prod04Id,
        name: "Syska Power Pro 20,000mAh Dual USB Power Bank",
        sku: "ELEC-SYSK-20K",
        description: "High-density Li-Polymer battery with 18W fast charging and LED charge indicator",
        categoryId: catElecId,
        categoryName: "Electronics & Peripherals",
        supplierId: supApexId,
        supplierName: "Apex Electro-Tech Distributors",
        purchasePrice: Decimal128.fromString("1100.00"),
        sellingPrice: Decimal128.fromString("1799.00"),
        stockQuantity: 6,
        minStockLevel: 12,
        unit: "pcs",
        imageUrl: "https://images.unsplash.com/photo-1609592424364-ffb4c8104d49?w=150&auto=format&fit=crop&q=80",
        status: "low_stock",
        createdAt: new Date("2026-01-16T11:00:00Z"),
        updatedAt: null
      },
      {
        _id: prod05Id,
        name: "Havells 4-Way Power Strip Surge Protector (2m Cord)",
        sku: "HOME-HAVE-4WAY",
        description: "Universal sockets with thermal trip surge protection and master switch",
        categoryId: catHomeId,
        categoryName: "Home & Electricals",
        supplierId: supBharatId,
        supplierName: "Bharat Wholesale Electricals",
        purchasePrice: Decimal128.fromString("430.00"),
        sellingPrice: Decimal128.fromString("699.00"),
        stockQuantity: 28,
        minStockLevel: 10,
        unit: "pcs",
        imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=150&auto=format&fit=crop&q=80",
        status: "in_stock",
        createdAt: new Date("2026-01-16T11:20:00Z"),
        updatedAt: null
      },
      {
        _id: prod06Id,
        name: "Classmate Pulse Spiral Bound Notebook (6-Pack)",
        sku: "STAT-CLAS-PULS",
        description: "Single line 300 pages each, elemental chlorine-free paper with poly-cover",
        categoryId: catStatId,
        categoryName: "Stationery & Office",
        supplierId: supKaveriId,
        supplierName: "Kaveri Office Solutions & Supplies",
        purchasePrice: Decimal128.fromString("210.00"),
        sellingPrice: Decimal128.fromString("360.00"),
        stockQuantity: 74,
        minStockLevel: 20,
        unit: "pack",
        imageUrl: "https://images.unsplash.com/photo-1544716278-e513176f20b5?w=150&auto=format&fit=crop&q=80",
        status: "in_stock",
        createdAt: new Date("2026-01-16T11:40:00Z"),
        updatedAt: null
      },
      {
        _id: prod07Id,
        name: "Godrej Nav-Tal 7-Lever Solid Brass Padlock (65mm)",
        sku: "HARD-GODR-65MM",
        description: "Rust-resistant brass body with hardened steel electroplated shackle & 3 keys",
        categoryId: catHardId,
        categoryName: "Hardware & Security",
        supplierId: supBharatId,
        supplierName: "Bharat Wholesale Electricals",
        purchasePrice: Decimal128.fromString("390.00"),
        sellingPrice: Decimal128.fromString("590.00"),
        stockQuantity: 4,
        minStockLevel: 10,
        unit: "pcs",
        imageUrl: "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=150&auto=format&fit=crop&q=80",
        status: "low_stock",
        createdAt: new Date("2026-01-16T12:00:00Z"),
        updatedAt: null
      },
      {
        _id: prod08Id,
        name: "D-Link DGS-1008A 8-Port Gigabit Desktop Switch",
        sku: "ELEC-DLIN-8PORT",
        description: "8 Gigabit Ethernet ports with green Ethernet technology and fanless quiet build",
        categoryId: catElecId,
        categoryName: "Electronics & Peripherals",
        supplierId: supApexId,
        supplierName: "Apex Electro-Tech Distributors",
        purchasePrice: Decimal128.fromString("1250.00"),
        sellingPrice: Decimal128.fromString("1950.00"),
        stockQuantity: 0,
        minStockLevel: 6,
        unit: "pcs",
        imageUrl: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=150&auto=format&fit=crop&q=80",
        status: "out_of_stock",
        createdAt: new Date("2026-01-16T12:20:00Z"),
        updatedAt: null
      },
      {
        _id: prod09Id,
        name: "Pigeon Cruise 1800W Induction Cooktop",
        sku: "HOME-PIGE-1800",
        description: "7 segment LED display, auto switch off, 93% energy saving technology",
        categoryId: catHomeId,
        categoryName: "Home & Electricals",
        supplierId: supBharatId,
        supplierName: "Bharat Wholesale Electricals",
        purchasePrice: Decimal128.fromString("1520.00"),
        sellingPrice: Decimal128.fromString("2499.00"),
        stockQuantity: 18,
        minStockLevel: 5,
        unit: "pcs",
        imageUrl: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=150&auto=format&fit=crop&q=80",
        status: "in_stock",
        createdAt: new Date("2026-01-16T12:40:00Z"),
        updatedAt: null
      },
      {
        _id: prod10Id,
        name: "Cadbury Celebrations Rich Dry Fruit Gift Pack (500g)",
        sku: "FMCG-CADB-DF500",
        description: "Almonds, cashews and raisins covered in rich chocolate confectionery",
        categoryId: catFmcgId,
        categoryName: "FMCG & Packaged Goods",
        supplierId: supGaneshId,
        supplierName: "Shree Ganesh Consumer Goods",
        purchasePrice: Decimal128.fromString("320.00"),
        sellingPrice: Decimal128.fromString("499.00"),
        stockQuantity: 36,
        minStockLevel: 10,
        unit: "box",
        imageUrl: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=150&auto=format&fit=crop&q=80",
        status: "in_stock",
        createdAt: new Date("2026-01-16T13:00:00Z"),
        updatedAt: null
      }
    ];

    // Purchases
    const purchasesData = [
      {
        _id: new ObjectId(),
        invoiceNumber: "PUR-2026-001",
        supplierId: supApexId,
        supplierName: "Apex Electro-Tech Distributors",
        items: [
          {
            productId: prod01Id,
            productName: "boAt Rockerz 450 Bluetooth On-Ear Headphone",
            sku: "ELEC-BOAT-450",
            quantity: 50,
            purchasePrice: Decimal128.fromString("950.00"),
            total: Decimal128.fromString("47500.00")
          },
          {
            productId: prod04Id,
            productName: "Syska Power Pro 20,000mAh Dual USB Power Bank",
            sku: "ELEC-SYSK-20K",
            quantity: 20,
            purchasePrice: Decimal128.fromString("1100.00"),
            total: Decimal128.fromString("22000.00")
          }
        ],
        subtotal: Decimal128.fromString("69500.00"),
        taxRate: Decimal128.fromString("18.00"),
        taxAmount: Decimal128.fromString("12510.00"),
        discount: Decimal128.fromString("1500.00"),
        grandTotal: Decimal128.fromString("80510.00"),
        paymentMethod: "Bank Transfer (NEFT)",
        status: "Completed",
        notes: "Consignment received in intact condition at Peenya warehouse.",
        createdAt: new Date("2026-02-05T14:30:00Z")
      },
      {
        _id: new ObjectId(),
        invoiceNumber: "PUR-2026-002",
        supplierId: supBharatId,
        supplierName: "Bharat Wholesale Electricals",
        items: [
          {
            productId: prod02Id,
            productName: "Philips 10W B22 LED Cool Day White Bulb (Pack of 4)",
            sku: "HOME-PHIL-10W",
            quantity: 120,
            purchasePrice: Decimal128.fromString("280.00"),
            total: Decimal128.fromString("33600.00")
          },
          {
            productId: prod05Id,
            productName: "Havells 4-Way Power Strip Surge Protector (2m Cord)",
            sku: "HOME-HAVE-4WAY",
            quantity: 40,
            purchasePrice: Decimal128.fromString("430.00"),
            total: Decimal128.fromString("17200.00")
          },
          {
            productId: prod09Id,
            productName: "Pigeon Cruise 1800W Induction Cooktop",
            sku: "HOME-PIGE-1800",
            quantity: 25,
            purchasePrice: Decimal128.fromString("1520.00"),
            total: Decimal128.fromString("38000.00")
          }
        ],
        subtotal: Decimal128.fromString("88800.00"),
        taxRate: Decimal128.fromString("18.00"),
        taxAmount: Decimal128.fromString("15984.00"),
        discount: Decimal128.fromString("2000.00"),
        grandTotal: Decimal128.fromString("102784.00"),
        paymentMethod: "RTGS",
        status: "Completed",
        notes: "Monthly wholesale procurement consignment.",
        createdAt: new Date("2026-02-12T16:00:00Z")
      },
      {
        _id: new ObjectId(),
        invoiceNumber: "PUR-2026-003",
        supplierId: supGaneshId,
        supplierName: "Shree Ganesh Consumer Goods",
        items: [
          {
            productId: prod03Id,
            productName: "Tata Tea Gold 500g Fresh Aroma Jar",
            sku: "FMCG-TATA-500",
            quantity: 70,
            purchasePrice: Decimal128.fromString("255.00"),
            total: Decimal128.fromString("17850.00")
          },
          {
            productId: prod10Id,
            productName: "Cadbury Celebrations Rich Dry Fruit Gift Pack (500g)",
            sku: "FMCG-CADB-DF500",
            quantity: 50,
            purchasePrice: Decimal128.fromString("320.00"),
            total: Decimal128.fromString("16000.00")
          }
        ],
        subtotal: Decimal128.fromString("33850.00"),
        taxRate: Decimal128.fromString("5.00"),
        taxAmount: Decimal128.fromString("1692.50"),
        discount: Decimal128.fromString("500.00"),
        grandTotal: Decimal128.fromString("35042.50"),
        paymentMethod: "Cheque",
        status: "Completed",
        notes: "Confectionery stock for festive inventory buffer.",
        createdAt: new Date("2026-02-18T11:15:00Z")
      }
    ];

    // Sales
    const salesData = [
      {
        _id: new ObjectId(),
        invoiceNumber: "INV-2026-001",
        customerName: "Venkateshwara Mart",
        customerPhone: "+91 94481 22334",
        customerEmail: "orders@venkatmart.com",
        items: [
          {
            productId: prod01Id,
            productName: "boAt Rockerz 450 Bluetooth On-Ear Headphone",
            sku: "ELEC-BOAT-450",
            quantity: 6,
            sellingPrice: Decimal128.fromString("1499.00"),
            costPriceAtSale: Decimal128.fromString("950.00"),
            total: Decimal128.fromString("8994.00")
          },
          {
            productId: prod04Id,
            productName: "Syska Power Pro 20,000mAh Dual USB Power Bank",
            sku: "ELEC-SYSK-20K",
            quantity: 8,
            sellingPrice: Decimal128.fromString("1799.00"),
            costPriceAtSale: Decimal128.fromString("1100.00"),
            total: Decimal128.fromString("14392.00")
          }
        ],
        subtotal: Decimal128.fromString("23386.00"),
        totalCostBasis: Decimal128.fromString("14500.00"),
        taxRate: Decimal128.fromString("18.00"),
        taxAmount: Decimal128.fromString("4209.48"),
        discount: Decimal128.fromString("595.48"),
        grandTotal: Decimal128.fromString("27000.00"),
        grossProfit: Decimal128.fromString("8886.00"),
        paymentMethod: "UPI",
        status: "Completed",
        notes: "Paid via PhonePe QR code.",
        createdAt: new Date("2026-02-10T11:45:00Z")
      },
      {
        _id: new ObjectId(),
        invoiceNumber: "INV-2026-002",
        customerName: "City Retail Supermarket",
        customerPhone: "+91 98200 44556",
        customerEmail: "accounts@cityretail.in",
        items: [
          {
            productId: prod02Id,
            productName: "Philips 10W B22 LED Cool Day White Bulb (Pack of 4)",
            sku: "HOME-PHIL-10W",
            quantity: 10,
            sellingPrice: Decimal128.fromString("449.00"),
            costPriceAtSale: Decimal128.fromString("280.00"),
            total: Decimal128.fromString("4490.00")
          },
          {
            productId: prod05Id,
            productName: "Havells 4-Way Power Strip Surge Protector (2m Cord)",
            sku: "HOME-HAVE-4WAY",
            quantity: 8,
            sellingPrice: Decimal128.fromString("699.00"),
            costPriceAtSale: Decimal128.fromString("430.00"),
            total: Decimal128.fromString("5592.00")
          },
          {
            productId: prod09Id,
            productName: "Pigeon Cruise 1800W Induction Cooktop",
            sku: "HOME-PIGE-1800",
            quantity: 5,
            sellingPrice: Decimal128.fromString("2499.00"),
            costPriceAtSale: Decimal128.fromString("1520.00"),
            total: Decimal128.fromString("12495.00")
          }
        ],
        subtotal: Decimal128.fromString("22577.00"),
        totalCostBasis: Decimal128.fromString("13840.00"),
        taxRate: Decimal128.fromString("18.00"),
        taxAmount: Decimal128.fromString("4063.86"),
        discount: Decimal128.fromString("640.86"),
        grandTotal: Decimal128.fromString("26000.00"),
        grossProfit: Decimal128.fromString("8737.00"),
        paymentMethod: "Net Banking",
        status: "Completed",
        notes: "HDFC corporate direct transfer.",
        createdAt: new Date("2026-02-14T15:20:00Z")
      },
      {
        _id: new ObjectId(),
        invoiceNumber: "INV-2026-003",
        customerName: "Aditi Enterprise & Cafe",
        customerPhone: "+91 91100 88776",
        customerEmail: "aditicafe@gmail.com",
        items: [
          {
            productId: prod03Id,
            productName: "Tata Tea Gold 500g Fresh Aroma Jar",
            sku: "FMCG-TATA-500",
            quantity: 12,
            sellingPrice: Decimal128.fromString("340.00"),
            costPriceAtSale: Decimal128.fromString("255.00"),
            total: Decimal128.fromString("4080.00")
          },
          {
            productId: prod10Id,
            productName: "Cadbury Celebrations Rich Dry Fruit Gift Pack (500g)",
            sku: "FMCG-CADB-DF500",
            quantity: 14,
            sellingPrice: Decimal128.fromString("499.00"),
            costPriceAtSale: Decimal128.fromString("320.00"),
            total: Decimal128.fromString("6986.00")
          }
        ],
        subtotal: Decimal128.fromString("11066.00"),
        totalCostBasis: Decimal128.fromString("7540.00"),
        taxRate: Decimal128.fromString("5.00"),
        taxAmount: Decimal128.fromString("553.30"),
        discount: Decimal128.fromString("119.30"),
        grandTotal: Decimal128.fromString("11500.00"),
        grossProfit: Decimal128.fromString("3526.00"),
        paymentMethod: "Cash",
        status: "Completed",
        notes: "Paid in cash at retail counter.",
        createdAt: new Date("2026-02-20T17:10:00Z")
      }
    ];

    // Stock Transactions Audit Logs
    const stockTransData = [
      {
        _id: new ObjectId(),
        productId: prod01Id,
        productName: "boAt Rockerz 450 Bluetooth On-Ear Headphone",
        sku: "ELEC-BOAT-450",
        type: "PURCHASE",
        quantity: 50,
        previousStock: 0,
        newStock: 50,
        referenceId: "PUR-2026-001",
        notes: "Initial purchase stock received from Apex Electro-Tech Distributors",
        timestamp: new Date("2026-02-05T14:30:00Z")
      },
      {
        _id: new ObjectId(),
        productId: prod04Id,
        productName: "Syska Power Pro 20,000mAh Dual USB Power Bank",
        sku: "ELEC-SYSK-20K",
        type: "PURCHASE",
        quantity: 20,
        previousStock: 0,
        newStock: 20,
        referenceId: "PUR-2026-001",
        notes: "Initial purchase stock received from Apex Electro-Tech Distributors",
        timestamp: new Date("2026-02-05T14:30:00Z")
      },
      {
        _id: new ObjectId(),
        productId: prod01Id,
        productName: "boAt Rockerz 450 Bluetooth On-Ear Headphone",
        sku: "ELEC-BOAT-450",
        type: "SALE",
        quantity: -6,
        previousStock: 50,
        newStock: 44,
        referenceId: "INV-2026-001",
        notes: "Dispatched against customer order INV-2026-001",
        timestamp: new Date("2026-02-10T11:45:00Z")
      },
      {
        _id: new ObjectId(),
        productId: prod04Id,
        productName: "Syska Power Pro 20,000mAh Dual USB Power Bank",
        sku: "ELEC-SYSK-20K",
        type: "SALE",
        quantity: -8,
        previousStock: 20,
        newStock: 12,
        referenceId: "INV-2026-001",
        notes: "Dispatched against customer order INV-2026-001",
        timestamp: new Date("2026-02-10T11:45:00Z")
      },
      {
        _id: new ObjectId(),
        productId: prod04Id,
        productName: "Syska Power Pro 20,000mAh Dual USB Power Bank",
        sku: "ELEC-SYSK-20K",
        type: "ADJUSTMENT_SUBTRACT",
        quantity: -6,
        previousStock: 12,
        newStock: 6,
        referenceId: "ADJ-2026-001",
        notes: "Stock write-off: units damaged in warehouse water leakage audit",
        timestamp: new Date("2026-02-18T09:00:00Z")
      },
      {
        _id: new ObjectId(),
        productId: prod01Id,
        productName: "boAt Rockerz 450 Bluetooth On-Ear Headphone",
        sku: "ELEC-BOAT-450",
        type: "ADJUSTMENT_SUBTRACT",
        quantity: -2,
        previousStock: 44,
        newStock: 42,
        referenceId: "ADJ-2026-002",
        notes: "Demo display sample allocation at showcase counter",
        timestamp: new Date("2026-02-22T10:30:00Z")
      }
    ];

    // 3. Clear existing or upsert documents
    console.log("\n[3/4] Seeding Collections into MongoDB Atlas...");

    // Clean & Insert Users
    await usersCol.deleteMany({});
    const resUsers = await usersCol.insertMany(usersData);
    console.log(`  ✓ Seeded users: ${resUsers.insertedCount} documents`);

    // Clean & Insert Categories
    await categoriesCol.deleteMany({});
    const resCats = await categoriesCol.insertMany(categoriesData);
    console.log(`  ✓ Seeded categories: ${resCats.insertedCount} documents`);

    // Clean & Insert Suppliers
    await suppliersCol.deleteMany({});
    const resSups = await suppliersCol.insertMany(suppliersData);
    console.log(`  ✓ Seeded suppliers: ${resSups.insertedCount} documents`);

    // Clean & Insert Products
    await productsCol.deleteMany({});
    const resProds = await productsCol.insertMany(productsData);
    console.log(`  ✓ Seeded products: ${resProds.insertedCount} documents`);

    // Clean & Insert Purchases
    await purchasesCol.deleteMany({});
    const resPurchases = await purchasesCol.insertMany(purchasesData);
    console.log(`  ✓ Seeded purchases: ${resPurchases.insertedCount} documents`);

    // Clean & Insert Sales
    await salesCol.deleteMany({});
    const resSales = await salesCol.insertMany(salesData);
    console.log(`  ✓ Seeded sales: ${resSales.insertedCount} documents`);

    // Clean & Insert StockTransactions
    await stockTransactionsCol.deleteMany({});
    const resStockTrans = await stockTransactionsCol.insertMany(stockTransData);
    console.log(`  ✓ Seeded stockTransactions: ${resStockTrans.insertedCount} documents`);

    // 4. Verification Count
    console.log("\n[4/4] Verifying Final Database State...");
    const stats = {
      users: await usersCol.countDocuments(),
      categories: await categoriesCol.countDocuments(),
      suppliers: await suppliersCol.countDocuments(),
      products: await productsCol.countDocuments(),
      purchases: await purchasesCol.countDocuments(),
      sales: await salesCol.countDocuments(),
      stockTransactions: await stockTransactionsCol.countDocuments()
    };

    console.table(stats);
    console.log("=================================================");
    console.log("🎉 MongoDB Atlas Setup & Database Seeding COMPLETE!");
    console.log("Database Name:", DATABASE_NAME);
    console.log("Admin Email:", "admin@smartinventory.in");
    console.log("Admin Password:", "admin123");
    console.log("=================================================");

  } catch (err) {
    console.error("❌ MongoDB Atlas Setup Error:", err.message);
    if (err.message.includes("whitelist") || err.message.includes("IP") || err.message.includes("querySrv")) {
      console.error("\n⚠️  NOTE ON MONGODB ATLAS NETWORK ACCESS / IP WHITELIST:");
      console.error("Please make sure Network Access in your MongoDB Atlas Dashboard is set to allow access:");
      console.error("  1. Go to cloud.mongodb.com -> Network Access");
      console.error("  2. Click '+ Add IP Address'");
      console.error("  3. Choose 'Allow Access from Anywhere' (0.0.0.0/0) or add your current IP address.");
    }
    process.exit(1);
  } finally {
    await client.close();
  }
}

run();
