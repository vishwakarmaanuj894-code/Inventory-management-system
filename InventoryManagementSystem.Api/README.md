# Smart Inventory Management System - ASP.NET Core Web API & MongoDB Atlas

Enterprise RESTful Web API backend built with **ASP.NET Core (.NET 8.0)**, **C#**, and the official **MongoDB C# Driver (`MongoDB.Driver`)**, seamlessly integrated with the Smart Inventory Management System HTML5/CSS3/Vanilla JavaScript frontend.

---

## 1. Architecture & Project Layout

```
InventoryManagementSystem.Api/
├── Controllers/
│   ├── AuthController.cs          # Admin login & current user profile
│   ├── ProductsController.cs      # Product catalog CRUD, search, & category filter
│   ├── CategoriesController.cs    # Category management & product assignment guard
│   ├── SuppliersController.cs     # Vendor directory & purchase order audit guard
│   ├── PurchasesController.cs     # Inward POs, automatic stock increase, & GRN
│   ├── SalesController.cs         # Customer sales, live stock check, & profit basis
│   ├── InventoryController.cs     # Live stock audit, low-stock alerts, & adjustments
│   ├── DashboardController.cs     # Real-time aggregated KPIs & monthly chart trends
│   └── ReportsController.cs       # P&L statements, inventory valuation, & CSV data
├── Models/
│   ├── User.cs                    # Administrator & staff accounts (BCrypt hashed)
│   ├── Product.cs                 # Catalog SKU, category, supplier, pricing, stock
│   ├── Category.cs                # Taxonomy category with unique name
│   ├── Supplier.cs                # Vendor company, contact, 15-digit Indian GSTIN
│   ├── Purchase.cs                # Inward procurement invoice with line items
│   ├── Sale.cs                    # Customer sale with CostPriceAtSale basis
│   └── StockTransaction.cs        # Immutable inventory movement audit log
├── DTOs/
│   ├── ApiResponse.cs             # Standardized JSON response envelope
│   ├── AuthDtos.cs                # Login request, JWT response, UserProfile
│   ├── ProductDtos.cs             # Product create/update/filter DTOs
│   ├── CategoryDtos.cs            # Category create/update/response DTOs
│   ├── SupplierDtos.cs            # Supplier create/update/response DTOs
│   ├── PurchaseDtos.cs            # Purchase input & response DTOs
│   ├── SaleDtos.cs                # Sale input & response DTOs
│   ├── InventoryDtos.cs           # Stock adjustment & transaction DTOs
│   ├── DashboardDtos.cs           # Dashboard KPI & monthly trends DTOs
│   └── ReportDtos.cs              # Financial P&L & product velocity DTOs
├── Services/
│   ├── AuthService.cs             # JWT generation & BCrypt verification
│   ├── ProductService.cs          # Product business logic & SKU uniqueness
│   ├── CategoryService.cs         # Category protection logic
│   ├── SupplierService.cs         # Supplier audit protection logic
│   ├── PurchaseService.cs         # Stock increase & transaction handling
│   ├── SaleService.cs             # Concurrency-safe decrement & profit basis
│   ├── InventoryService.cs        # Adjustments with reason & negative stock guard
│   ├── DashboardService.cs        # Real-time KPI aggregation & chart statistics
│   └── ReportService.cs           # Accurate profit calculation via recorded cost
├── Repositories/
│   ├── UserRepository.cs
│   ├── ProductRepository.cs
│   ├── CategoryRepository.cs
│   ├── SupplierRepository.cs
│   ├── PurchaseRepository.cs
│   ├── SaleRepository.cs
│   └── StockTransactionRepository.cs
├── Data/
│   └── MongoDbContext.cs          # MongoClient, collection accessors, transactions
├── Middleware/
│   └── ExceptionHandlingMiddleware.cs # Centralized error formatting
├── Program.cs                     # DI setup, JWT Bearer, CORS, Swagger, Index seed
├── appsettings.json               # MongoDB connection string & JWT configuration
├── appsettings.Development.json   # Local dev overrides
└── InventoryManagementSystem.Api.csproj # .NET 8.0 project file
```

---

## 2. MongoDB Atlas Configuration

### Step A: Create a MongoDB Atlas Cluster
1. Sign in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free shared cluster (e.g. `M0 Sandbox`).
3. Under **Security > Database Access**:
   - Create a database user (e.g., `inventory_admin`).
   - Choose **Password** authentication and generate a strong password.
   - Assign the **Read and write to any database** built-in role.
4. Under **Security > Network Access**:
   - Click **Add IP Address**.
   - For local development, add your current IP address (or `0.0.0.0/0` for initial staging testing).

### Step B: Obtain Your Connection String
1. Under **Databases**, click **Connect**.
2. Select **Drivers** (Driver: **C# / .NET**, Version: **2.19 or later**).
3. Copy the SRV connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=SmartInventoryCluster
   ```

### Step C: Configure Connection String Securely
**Never commit real credentials to Git!** Use one of these methods:

#### Method 1: Environment Variable (Recommended for Production / Cloud Run)
```bash
export MONGODB_CONNECTION_STRING="mongodb+srv://inventory_admin:YourStrongPassword@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority"
export MONGODB_DATABASE_NAME="SmartInventoryDb"
```

#### Method 2: Local User Secrets (.NET Secret Manager)
```bash
cd InventoryManagementSystem.Api
dotnet user-secrets init
dotnet user-secrets set "MongoDbSettings:ConnectionString" "mongodb+srv://inventory_admin:YourStrongPassword@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority"
```

#### Method 3: `appsettings.Development.json` (Local Development)
Edit `InventoryManagementSystem.Api/appsettings.Development.json`:
```json
"MongoDbSettings": {
  "ConnectionString": "mongodb+srv://inventory_admin:YourStrongPassword@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority",
  "DatabaseName": "SmartInventoryDb"
}
```

---

## 3. Required NuGet Packages

The project file (`InventoryManagementSystem.Api.csproj`) already references:
- `MongoDB.Driver` (v2.28.0) - Official MongoDB C# driver.
- `Microsoft.AspNetCore.Authentication.JwtBearer` (v8.0.0) - JWT Bearer token authentication.
- `BCrypt.Net-Next` (v4.0.3) - Secure salted password hashing for admin credentials.
- `Swashbuckle.AspNetCore` (v6.5.0) - Interactive Swagger API documentation UI with Bearer support.
- `System.IdentityModel.Tokens.Jwt` (v8.0.0) - JWT token parsing and claims generation.

To restore dependencies:
```bash
cd InventoryManagementSystem.Api
dotnet restore
```

---

## 4. How to Run the Backend

### Prerequisites:
- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) or Visual Studio 2022 / VS Code with C# Dev Kit.

### Running with .NET CLI:
```bash
cd InventoryManagementSystem.Api
dotnet run
```
The Web API starts on `http://localhost:5000` (HTTP) and `https://localhost:7001` (HTTPS).

### Running with Visual Studio:
1. Open Visual Studio.
2. Open `InventoryManagementSystem.Api/InventoryManagementSystem.Api.csproj`.
3. Set `InventoryManagementSystem.Api` as the Startup Project.
4. Press **F5** or click **Run**.

---

## 5. Testing with Interactive Swagger UI

1. Open your browser and navigate to:
   ```
   http://localhost:5000/swagger
   ```
2. **Authorize via Swagger**:
   - Expand `POST /api/auth/login`.
   - Click **Try it out**, enter the default credentials:
     ```json
     {
       "email": "admin@smartinventory.in",
       "password": "admin123"
     }
     ```
   - Click **Execute**. Copy the returned `token` string from the JSON response.
   - Scroll up to the top of Swagger, click the **Authorize** (lock) button.
   - Enter `Bearer <your_token>` and click **Authorize**.
   - All protected endpoints (`POST`, `PUT`, `DELETE`, `/api/inventory/adjust`) are now authenticated.

---

## 6. Verification and Testing Manual (All 12 Test Cases)

### Test Case 1: Product CRUD
- **Create**: `POST /api/products` with name, SKU (`ELEC-BOAT-450`), categoryId, supplierId, purchasePrice (`950`), sellingPrice (`1499`), stockQuantity (`40`). Status should be `201 Created`.
- **Get All**: `GET /api/products?search=boat` returns matched product.
- **Get By ID**: `GET /api/products/{id}` returns the product details.
- **Update**: `PUT /api/products/{id}` with modified price.
- **Delete**: `DELETE /api/products/{id}` removes product and returns `200 OK`.

### Test Case 2: Category CRUD & Assigned Product Protection
- **Create**: `POST /api/categories` with name `"Audio Devices"` and code `"AUDIO"`.
- **Assign**: Create a product using this `categoryId`.
- **Delete Attempt**: Call `DELETE /api/categories/{id}`.
- **Expected Result**: Returns `409 Conflict` with error: *"Cannot delete category 'Audio Devices'. There are 1 active product(s) assigned to this category. Please reassign or delete these products first."*

### Test Case 3: Supplier CRUD & Purchase Reference Protection
- **Create**: `POST /api/suppliers` with company name, email, phone, and 15-digit GSTIN (`29AABCA5678D1Z2`).
- **Assign**: Create a purchase order referencing this supplier.
- **Delete Attempt**: Call `DELETE /api/suppliers/{id}`.
- **Expected Result**: Returns `409 Conflict` with error: *"Cannot delete supplier ... There are historical purchase invoice(s) linked to this vendor for tax audit purposes."*

### Test Case 4: Successful Purchase & Stock Replenishment
- Call `POST /api/purchases`:
  ```json
  {
    "supplierId": "<valid_supplier_id>",
    "items": [
      { "productId": "<valid_product_id>", "quantity": 25, "purchasePrice": 950 }
    ],
    "taxRate": 18,
    "discount": 500,
    "paymentMethod": "NEFT"
  }
  ```
- **Expected Result**:
  - `201 Created` with computed subtotal, tax amount, and grand total.
  - Product stock quantity automatically increases by 25 units.
  - A new transaction of type `PURCHASE` is recorded in `stockTransactions`.

### Test Case 5: Successful Sale & Cost Basis Recording
- Call `POST /api/sales`:
  ```json
  {
    "customerName": "Venkateshwara Mart",
    "customerPhone": "+91 98450 12345",
    "items": [
      { "productId": "<valid_product_id>", "quantity": 5 }
    ],
    "taxRate": 18,
    "discount": 100
  }
  ```
- **Expected Result**:
  - `201 Created` with computed line totals and gross profit.
  - Product inventory automatically decrements by 5.
  - `CostPriceAtSale` is stored on the sale item for accurate historical profit reports.
  - A transaction of type `SALE` with quantity `-5` is recorded in `stockTransactions`.

### Test Case 6: Insufficient Stock Rejection
- Call `POST /api/sales` with a product whose available stock is 8, but request quantity is 50.
- **Expected Result**: `400 Bad Request` with error: *"Insufficient stock for 'boAt Rockerz 450'. Available inventory: 8 units, Requested: 50 units."*
- Stock remains unchanged.

### Test Case 7: Negative Quantity & Negative Stock Rejection
- Call `POST /api/inventory/adjust` with `adjustmentType: "subtract"`, `quantity: 100` on an item with 10 units in stock.
- **Expected Result**: `400 Bad Request` with message: *"Cannot subtract 100 units. Current available stock is only 10 units. Negative stock is strictly prohibited."*

### Test Case 8: Duplicate SKU Rejection
- Call `POST /api/products` with an existing SKU (e.g. `ELEC-BOAT-450`).
- **Expected Result**: `409 Conflict` with message: *"A product with SKU 'ELEC-BOAT-450' already exists."*

### Test Case 9: Invalid MongoDB ObjectId Handling
- Call `GET /api/products/12345-invalid-id`.
- **Expected Result**: `400 Bad Request` with message: *"Invalid MongoDB ObjectId format: '12345-invalid-id'."*

### Test Case 10: Authentication and Authorization
- Call `POST /api/products` without the `Authorization: Bearer <token>` header.
- **Expected Result**: `401 Unauthorized`.

### Test Case 11: Real Aggregated Dashboard Calculations
- Call `GET /api/dashboard/summary`.
- **Expected Result**: Returns real-time counts, total revenue, gross profit, margin %, recent 5 transactions, low stock list, and top selling items.
- Call `GET /api/dashboard/sales-overview`.
- **Expected Result**: Returns 6-month monthly trends comparing sales vs purchases.

### Test Case 12: Reports & True Profit Calculation
- Call `GET /api/reports/summary?timeframe=month`.
- **Expected Result**:
  - `GrossRevenue`: Sum of sales grand totals.
  - `CostOfGoodsSold`: Calculated from `CostPriceAtSale * quantity` for each sale item.
  - `GrossProfit`: Accurate difference between net revenue and actual cost basis.

---

## 7. Frontend Integration Gateway

The frontend JavaScript client (`frontend/js/api.js` and `js/api.js`) contains a centralized gateway:
- **`API_CONFIG.baseUrl`**: Configured to `http://localhost:5000/api`.
- **`API_CONFIG.useBackendApi`**: Set to `true` to route all frontend operations directly to this ASP.NET Core Web API.
- In the frontend **Settings** module, click **Test Connection** to ping the running C# backend and verify live MongoDB connectivity.
