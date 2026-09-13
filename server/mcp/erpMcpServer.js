/**
 * Official Read-Only Model Context Protocol (MCP) Server for Smart Manufacturing ERP Integration.
 * Uses @modelcontextprotocol/sdk (Server, StdioServerTransport / CallToolRequestSchema / ListToolsRequestSchema).
 * 
 * Strict Security Principles:
 * 1. Read-only HTTP GET requests ONLY to the ERP Gateway (http://localhost:5000).
 * 2. Propagates X-Correlation-ID across calls.
 * 3. Signs request authorization using shared JWT_SECRET.
 * 4. NEVER exposes credentials or raw tokens to the tool response output.
 * 5. Does NOT access ERP PostgreSQL directly.
 * 6. Hard-blocks arbitrary SQL execution, shell execution, or write operations.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { executeLocalMcpTool } from "./localErpAdapter.js";

const ERP_GATEWAY_URL = process.env.ERP_GATEWAY_URL || "http://localhost:5000";
const JWT_SECRET = process.env.ERP_JWT_SECRET || "super_secret_jwt_key_change_me_in_production";

/**
 * Generates an internal service Bearer token for ERP Gateway requests
 */
function getServiceAuthHeader() {
  const token = jwt.sign(
    {
      sub: "sys-incidentai-mcp",
      email: "mcp-service@incidentai.internal",
      role: "viewer", // Standard read-only ERP service context
      iss: "incidentai-mcp-server"
    },
    JWT_SECRET,
    { expiresIn: "5m" }
  );
  return `Bearer ${token}`;
}

/**
 * Helper to execute read-only GET requests against the ERP API Gateway
 */
async function fetchErpData(endpoint, correlationId) {
  const traceId = correlationId || `mcp-${crypto.randomUUID()}`;
  const url = `${ERP_GATEWAY_URL}${endpoint}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": getServiceAuthHeader(),
        "X-Correlation-ID": traceId,
        "X-User-Id": "sys-incidentai-mcp",
        "X-User-Role": "viewer"
      },
      signal: AbortSignal.timeout(3000)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        status: res.status,
        error: `ERP Gateway returned HTTP ${res.status}: ${errText.slice(0, 200)}`,
        correlationId: traceId
      };
    }

    const data = await res.json();
    return {
      status: 200,
      data,
      correlationId: traceId
    };
  } catch (err) {
    return {
      status: 500,
      error: `Failed to connect to ERP Gateway at ${url}: ${err.message}`,
      correlationId: traceId
    };
  }
}

/**
 * Tool Definition Registry — 7 Verified Read-Only ERP Capabilities
 */
const VERIFIED_TOOLS = [
  {
    name: "get_invoice",
    description: "Retrieves financial invoices or specific invoice details from the ERP Finance Service.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Optional specific Invoice ID or Number (e.g. INV-1042)" }
      }
    }
  },
  {
    name: "get_inventory",
    description: "Retrieves current warehouse stock items and inventory balances from the ERP Inventory Service.",
    inputSchema: {
      type: "object",
      properties: {
        product_id: { type: "string", description: "Optional specific Product/Stock ID filter" }
      }
    }
  },
  {
    name: "get_product",
    description: "Retrieves master product catalog and specifications from the ERP Inventory Service.",
    inputSchema: {
      type: "object",
      properties: {
        product_id: { type: "string", description: "Optional specific Product ID filter" }
      }
    }
  },
  {
    name: "get_purchase_order",
    description: "Retrieves procurement purchase orders from the ERP Procurement Service.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Optional Purchase Order ID (e.g. PO-2026-001)" }
      }
    }
  },
  {
    name: "get_production_order",
    description: "Retrieves shop floor production runs and assembly status from the ERP Production Service.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Optional Production Run ID" }
      }
    }
  },
  {
    name: "get_transaction",
    description: "Retrieves general ledger transactions and accounting records from the ERP Finance Service.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Optional Ledger Transaction ID" }
      }
    }
  },
  {
    name: "get_service_health",
    description: "Retrieves service health status and metrics across all ERP microservices.",
    inputSchema: {
      type: "object",
      properties: {
        service_name: { type: "string", description: "Optional specific service filter (auth, finance, inventory, etc.)" }
      }
    }
  }
];

/**
 * Creates and configures the MCP Server instance
 */
export function createErpMcpServer() {
  const server = new Server(
    {
      name: "incidentai-erp-mcp-server",
      version: "1.0.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // List Available Tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: VERIFIED_TOOLS
    };
  });

  // Execute Tool Requests
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    const correlationId = request.params.correlationId || `mcp-req-${crypto.randomUUID()}`;

    switch (name) {
      case "get_invoice": {
        const endpoint = args.id ? `/api/finance/invoices?id=${encodeURIComponent(args.id)}` : `/api/finance/invoices`;
        const result = await fetchErpData(endpoint, correlationId);
        return formatToolResponse(result);
      }

      case "get_inventory": {
        const endpoint = `/api/inventory/stock`;
        const result = await fetchErpData(endpoint, correlationId);
        return formatToolResponse(result);
      }

      case "get_product": {
        const endpoint = `/api/inventory/products`;
        const result = await fetchErpData(endpoint, correlationId);
        return formatToolResponse(result);
      }

      case "get_purchase_order": {
        const endpoint = args.id ? `/api/procurement/po/${encodeURIComponent(args.id)}` : `/api/procurement/po`;
        const result = await fetchErpData(endpoint, correlationId);
        return formatToolResponse(result);
      }

      case "get_production_order": {
        const endpoint = `/api/production/runs`;
        const result = await fetchErpData(endpoint, correlationId);
        return formatToolResponse(result);
      }

      case "get_transaction": {
        const endpoint = `/api/finance/ledger`;
        const result = await fetchErpData(endpoint, correlationId);
        return formatToolResponse(result);
      }

      case "get_service_health": {
        const endpoint = `/health/services`;
        const result = await fetchErpData(endpoint, correlationId);
        return formatToolResponse(result);
      }

      default:
        throw new Error(`Tool '${name}' is not supported or is forbidden.`);
    }
  });

  return server;
}

function formatToolResponse(result) {
  if (result.error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: false,
            error: result.error,
            correlationId: result.correlationId
          }, null, 2)
        }
      ],
      isError: true
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          success: true,
          correlationId: result.correlationId,
          data: result.data
        }, null, 2)
      }
    ]
  };
}

const GATEWAY_ENDPOINTS = {
  get_invoice: (a) => (a.id ? `/api/finance/invoices?id=${encodeURIComponent(a.id)}` : `/api/finance/invoices`),
  get_inventory: () => `/api/inventory/stock`,
  get_product: () => `/api/inventory/products`,
  get_purchase_order: (a) => (a.id ? `/api/procurement/po/${encodeURIComponent(a.id)}` : `/api/procurement/po`),
  get_production_order: () => `/api/production/runs`,
  get_transaction: () => `/api/finance/ledger`,
  get_service_health: () => `/health/services`
};

/**
 * Direct invocation helper for testing or internal MCP tool execution.
 *
 * Tries the real Smart Manufacturing ERP Gateway first; if it is unreachable or errors,
 * falls back to the local read-only adapter backed by IncidentAI's embedded ERP state so
 * MCP evidence stays real even without the external gateway. Every successful result is
 * tagged `source: "gateway"` or `source: "embedded"` for honest UI labelling.
 */
export async function executeMcpToolDirect(toolName, toolArgs = {}, correlationId = null) {
  const cid = correlationId || `mcp-direct-${crypto.randomUUID()}`;
  const endpointFn = GATEWAY_ENDPOINTS[toolName];
  if (!endpointFn) {
    return { status: 400, error: `Forbidden or unknown tool: ${toolName}`, correlationId: cid };
  }

  const gatewayResult = await fetchErpData(endpointFn(toolArgs), cid);
  if (gatewayResult.status === 200) {
    return { ...gatewayResult, source: "gateway" };
  }

  const localResult = await executeLocalMcpTool(toolName, toolArgs, cid);
  if (localResult.status === 200) {
    return { ...localResult, source: "embedded", gateway_error: gatewayResult.error };
  }
  return gatewayResult;
}
