# 🗺️ ERP API Integration Map (Phase 1 Audit)

> **Document Type:** Real Backend Endpoint Mapping & Verification Matrix  
> **Source Repositories:** `Smart Manufacturing ERP` (`gateway/` & `backend/services/`) & `IncidentAI`  
> **Status:** Phase 1 Verified — Zero Invented Endpoints

---

## 📋 Master Capabilities Verification Matrix

The following table maps the 10 proposed Model Context Protocol (MCP) capabilities directly against the actual inspected codebase routes in the ERP system.

| Capability | Proposed MCP Tool | Gateway Route | Downstream Service | HTTP Method | Auth / RBAC Required | Real Route Status |
|---|---|---|---|---|---|---|
| **1. Invoice** | `get_invoice` | `/api/finance/invoices` | Finance Service (`8083`) | `GET` | JWT + `admin`, `cfo`, `finance_manager`, `viewer` | 🟡 List available (`/finance/invoices`), single ID route NOT AVAILABLE |
| **2. Customer** | `get_customer` | N/A | N/A | N/A | N/A | 🔴 NOT AVAILABLE |
| **3. Inventory** | `get_inventory` | `/api/inventory/stock` | Inventory Service (`8081`) | `GET` | JWT + `admin`, `inventory_manager`, `warehouse_manager`, `viewer` | 🟢 EXCLUSIVELY AVAILABLE |
| **4. Product** | `get_product` | `/api/inventory/products` | Inventory Service (`8081`) | `GET` | JWT + `admin`, `inventory_manager`, `warehouse_manager`, `viewer` | 🟢 EXCLUSIVELY AVAILABLE |
| **5. Purchase Order** | `get_purchase_order` | `/api/procurement/po/:id` | Procurement Service (`8082`) | `GET` | JWT + `admin`, `procurement_specialist`, `procurement_manager`, `viewer` | 🟢 EXCLUSIVELY AVAILABLE |
| **6. Production Order**| `get_production_order` | `/api/production/runs` | Production Service (`8085`) | `GET` | JWT + `admin`, `shop_floor_supervisor`, `production_manager`, `viewer` | 🟢 EXCLUSIVELY AVAILABLE |
| **7. Finance Ledger** | `get_transaction` | `/api/finance/ledger` | Finance Service (`8083`) | `GET` | JWT + `admin`, `cfo`, `finance_manager`, `viewer` | 🟢 EXCLUSIVELY AVAILABLE |
| **8. Service Health** | `get_service_health` | `/health/services` | API Gateway (`5000`) | `GET` | None (Public Health Ping) | 🟢 EXCLUSIVELY AVAILABLE |
| **9. Service Logs** | `get_recent_errors` | N/A (Prometheus `/metrics`) | Prometheus / Loki | `GET` | N/A | 🟡 Direct proxy route NOT AVAILABLE; available via Prometheus `/metrics` |
| **10. Configuration** | `get_configuration` | N/A | N/A | N/A | N/A | 🔴 NOT AVAILABLE |

---

## 🔍 Detailed Capability Verification

### 1. Invoice Capability (`get_invoice`)
* **MCP Tool Name:** `get_invoice(invoice_id)`
* **Gateway Route:** `GET /api/finance/invoices`
* **Downstream Service:** Finance Service (`http://localhost:8083/finance/invoices`)
* **Authentication Requirement:** JWT Bearer Token required
* **RBAC Requirement:** Roles: `admin`, `cfo`, `finance_manager`, `viewer`
* **Request Parameters:** None (Query string filtering by `id` handled in-memory or by list lookup)
* **Response Structure:**
  ```json
  [
    {
      "id": "INV-1042",
      "customer_name": "Tesla Energy Supply",
      "amount": 45000.00,
      "status": "DRAFT",
      "issued_at": "2026-08-23T10:00:00Z"
    }
  ]
  ```
* **Verification Status:** **PARTIALLY AVAILABLE** (List endpoint exists; single `:id` parameter filter is performed against list output).

---

### 2. Customer Capability (`get_customer`)
* **MCP Tool Name:** `get_customer(customer_id)`
* **Gateway Route:** N/A
* **Downstream Service:** N/A
* **Verification Status:** 🔴 **NOT AVAILABLE**. General Ledger accounts exist via `GET /api/finance/accounts`, but customer entity routes are not implemented in the current Go backend.

---

### 3. Inventory Stock Level Capability (`get_inventory`)
* **MCP Tool Name:** `get_inventory(product_id)`
* **Gateway Route:** `GET /api/inventory/stock`
* **Downstream Service:** Inventory Service (`http://localhost:8081/inventory/stock`)
* **Authentication Requirement:** JWT Bearer Token required
* **RBAC Requirement:** Roles: `admin`, `inventory_manager`, `warehouse_manager`, `viewer`
* **Request Parameters:** Optional `product_id` query filter
* **Response Structure:**
  ```json
  [
    {
      "id": "stk-001",
      "product_id": "PROD-BATTERY-CELL",
      "warehouse_id": "wh-main-01",
      "quantity": 300.00,
      "reorder_point": 100.00
    }
  ]
  ```
* **Verification Status:** 🟢 **AVAILABLE & VERIFIED**.

---

### 4. Product Catalog Capability (`get_product`)
* **MCP Tool Name:** `get_product(product_id)`
* **Gateway Route:** `GET /api/inventory/products`
* **Downstream Service:** Inventory Service (`http://localhost:8081/inventory/products`)
* **Authentication Requirement:** JWT Bearer Token required
* **RBAC Requirement:** Roles: `admin`, `inventory_manager`, `warehouse_manager`, `viewer`
* **Request Parameters:** None
* **Response Structure:**
  ```json
  [
    {
      "id": "PROD-BATTERY-CELL",
      "name": "Li-Ion Battery Cell 21700",
      "sku": "CELL-21700-45Ah",
      "unit": "pcs",
      "cost_price": 4.50
    }
  ]
  ```
* **Verification Status:** 🟢 **AVAILABLE & VERIFIED**.

---

### 5. Purchase Order Capability (`get_purchase_order`)
* **MCP Tool Name:** `get_purchase_order(po_id)`
* **Gateway Route:** `GET /api/procurement/po/:id` AND `GET /api/procurement/po`
* **Downstream Service:** Procurement Service (`http://localhost:8082/procurement/po/:id`)
* **Authentication Requirement:** JWT Bearer Token required
* **RBAC Requirement:** Roles: `admin`, `procurement_specialist`, `procurement_manager`, `viewer`
* **Request Parameters:** `id` URL path parameter (UUID or PO string)
* **Response Structure:**
  ```json
  {
    "id": "db904232-9641-47c8-a57b-85dc04238ee4",
    "vendor_id": "vnd-supplier-01",
    "status": "auto_generated",
    "total_amount": 12500.00,
    "items": [
      { "product_id": "PROD-BATTERY-CELL", "quantity": 1000, "unit_price": 4.50 }
    ]
  }
  ```
* **Verification Status:** 🟢 **AVAILABLE & VERIFIED**.

---

### 6. Production Run Capability (`get_production_order`)
* **MCP Tool Name:** `get_production_order(order_id)`
* **Gateway Route:** `GET /api/production/runs`
* **Downstream Service:** Production Service (`http://localhost:8085/production/runs`)
* **Authentication Requirement:** JWT Bearer Token required
* **RBAC Requirement:** Roles: `admin`, `shop_floor_supervisor`, `production_manager`, `viewer`
* **Request Parameters:** None
* **Response Structure:**
  ```json
  [
    {
      "id": "7785bfe6-1760-4723-8998-ff84cdd35dae",
      "bom_id": "bom-pack-01",
      "quantity": 1.0,
      "status": "in_progress",
      "started_at": "2026-08-23T14:00:00Z"
    }
  ]
  ```
* **Verification Status:** 🟢 **AVAILABLE & VERIFIED**.

---

### 7. Finance Ledger Entry Capability (`get_transaction`)
* **MCP Tool Name:** `get_transaction(transaction_id)`
* **Gateway Route:** `GET /api/finance/ledger`
* **Downstream Service:** Finance Service (`http://localhost:8083/finance/ledger`)
* **Authentication Requirement:** JWT Bearer Token required
* **RBAC Requirement:** Roles: `admin`, `cfo`, `finance_manager`, `viewer`
* **Request Parameters:** None (Returns top 100 recent ledger transactions)
* **Response Structure:**
  ```json
  [
    {
      "id": "tx-10042",
      "account_id": "acc-1010-cash",
      "debit": 45000.00,
      "credit": 0.00,
      "description": "Invoice INV-1042 Payment Received",
      "created_at": "2026-08-23T14:15:00Z"
    }
  ]
  ```
* **Verification Status:** 🟢 **AVAILABLE & VERIFIED**.

---

### 8. System Health Telemetry Capability (`get_service_health`)
* **MCP Tool Name:** `get_service_health(service_name)`
* **Gateway Route:** `GET /health/services` AND `GET /health`
* **Downstream Service:** Executed directly in API Gateway (`http://localhost:5000/health/services`)
* **Authentication Requirement:** None (Public)
* **RBAC Requirement:** None
* **Request Parameters:** Optional `service_name` filter
* **Response Structure:**
  ```json
  {
    "gateway": "UP",
    "overall": "UP",
    "services": [
      { "name": "auth-service", "status": "UP" },
      { "name": "inventory-service", "status": "UP" },
      { "name": "procurement-service", "status": "UP" },
      { "name": "finance-service", "status": "UP" },
      { "name": "intelligence-service", "status": "UP" }
    ],
    "timestamp": "2026-08-23T14:35:00Z"
  }
  ```
* **Verification Status:** 🟢 **AVAILABLE & VERIFIED**.

---

### 9. Service Log / Recent Errors Capability (`get_recent_errors`)
* **MCP Tool Name:** `get_recent_errors(service_name)`
* **Gateway Route:** N/A (Exposed via Prometheus `/metrics` on every microservice port, or Loki log aggregator)
* **Downstream Service:** Prometheus / Loki
* **Verification Status:** 🟡 **INDIRECTLY AVAILABLE**. Direct Express proxy route is NOT exposed; MCP client will query `/health/services` or Prometheus `/metrics`.

---

### 10. Module Configuration Capability (`get_configuration`)
* **MCP Tool Name:** `get_configuration(module_name)`
* **Gateway Route:** N/A
* **Downstream Service:** N/A
* **Verification Status:** 🔴 **NOT AVAILABLE**. Environment flags are internal to microservices; no public configuration endpoint exists.

---

## 🔒 Security & Headers Contract

For all valid routes forwarded by the API Gateway (`http://localhost:5000`), the gateway automatically injects identity and correlation context into downstream microservice requests:

* `X-Correlation-ID`: `req.correlationId` (UUID v4)
* `X-User-Id`: `req.user.sub`
* `X-User-Email`: `req.user.email`
* `X-User-Role`: `req.user.role`
