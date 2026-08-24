# 🔐 Auth & RBAC Architecture Specification (Independent Dual-System Model)

> **Document Type:** Cross-System Authentication, System Boundaries, and Independent RBAC Specification  
> **Source Repositories:** `Smart Manufacturing ERP` & `IncidentAI`  
> **Status:** Fully Aligned — Independent RBAC System Model

---

## 🏛️ Executive Rule: ERP Role ≠ IncidentAI Persona

The integration maintains **two completely independent Role-Based Access Control (RBAC) domains**:

1. **System 1: Smart Manufacturing ERP (System of Record)**  
   * Owns business roles: `viewer`, `finance_manager`, `inventory_manager`, `warehouse_manager`, `procurement_specialist`, `procurement_manager`, `shop_floor_supervisor`, `production_manager`, `cfo`, `admin`.  
   * Controls access exclusively to ERP business functions, financial ledgers, procurement orders, and inventory systems.

2. **System 2: IncidentAI (AI Incident Intelligence Layer)**  
   * Owns native personas: `END_USER`, `SUPPORT_TRIAGE`, `DEVELOPER`, `EXECUTIVE`.  
   * Controls access exclusively to IncidentAI internal portals: Developer Remediation Workbench, Triage Command Center, and Executive Risk Dashboard.

> [!IMPORTANT]
> **CRITICAL SECURITY BOUNDARY:**  
> An ERP role does **NOT** grant or map to any IncidentAI internal persona.  
> An ERP user with role `admin` or `cfo` does **NOT** gain access to the IncidentAI Developer Workbench, Triage Control Center, or Executive Dashboard unless they hold an explicit, native IncidentAI account/persona assignment.

---

## 🏗️ Cross-System Authentication & Ingestion Flow

IncidentAI trusts ERP authentication to verify the identity of the user submitting an incident report from the ERP interface.

```
                  ┌─────────────────────────────────────┐
                  │          ERP LOGIN PAGE             │
                  │       (POST /api/auth/login)        │
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │    ERP AUTH SERVICE (Port 8080)     │
                  │   Mints JWT Token signed with       │
                  │   JWT_SECRET                        │
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │        NEXT.JS ERP FRONTEND         │
                  │    Stores Bearer Token in Session   │
                  └──────────────────┬──────────────────┘
                                     │
                        Clicks [ 🚨 Report Issue ]
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │    INCIDENT AI INGESTION API        │
                  │  (POST /api/incidents/ingest 4000)  │
                  │  Header: Authorization: Bearer <jwt>│
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │      INCIDENT AI BACKEND            │
                  │ Validates JWT: "Authenticated ERP   │
                  │ user submitting incident report"    │
                  │ Passes ERP Role in erp_context as   │
                  │ diagnostic metadata ONLY            │
                  └─────────────────────────────────────┘
```

---

## 📋 Role Usage Scope vs. Contextual Metadata

| Property | Smart Manufacturing ERP | IncidentAI |
|---|---|---|
| **Authentication Purpose** | Authenticate ERP login & session | Verify user identity for incident reporting (`requireAuth`) |
| **RBAC Authorization** | Authorize ERP module & API access | Authorize IncidentAI staff portals (`requireRole(STAFF_ROLES)`) |
| **ERP Role Handling** | System of Record business permission | Non-authoritative diagnostic context (`erp_context.user_role`) |

### Contextual Metadata Object
When an ERP user reports an issue, their ERP user ID and ERP role are attached strictly as **incident metadata** for root-cause reasoning and audit logging:

```json
{
  "erp_context": {
    "erp": "Smart Manufacturing ERP",
    "module": "Finance",
    "route": "/finance/invoices/INV-1042",
    "record_id": "INV-1042",
    "user_id": "d3b07384-d113-4603-99b3-764724b07e78",
    "user_role": "finance_manager",
    "timestamp": "2026-08-23T14:45:00Z"
  }
}
```

This metadata informs LLM root-cause analysis (e.g. knowing the user had `finance_manager` privileges during the error), but **never** elevates or alters the user's IncidentAI access rights.
