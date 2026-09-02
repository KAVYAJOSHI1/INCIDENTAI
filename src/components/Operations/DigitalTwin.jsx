import React, { useEffect, useState } from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Map,
  Sparkles,
  Package,
  ShoppingCart,
  Cpu,
  FileCheck,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Send,
  Layers,
  CheckCircle2,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { fetchDigitalTwin, ingestIncident } from '../../services/apiClient';

const HEALTH_STYLE = {
  RED: { background: '#FFF1F2', color: '#9F1239', border: '2px solid #FDA4AF' },
  YELLOW: { background: '#FFFBEB', color: '#92400E', border: '2px solid #FCD34D' },
  GREEN: { background: '#ECFDF5', color: '#065F46', border: '2px solid #6EE7B7' }
};

const NODE_POSITIONS = {
  INVOICING: { x: 60, y: 40 },
  PAYROLL: { x: 60, y: 220 },
  INVENTORY: { x: 60, y: 400 },
  PROCUREMENT: { x: 380, y: 400 },
  GENERAL_LEDGER: { x: 680, y: 220 },
  PRODUCTION: { x: 380, y: 40 },
  ORDERS: { x: 680, y: 40 }
};

export default function DigitalTwin({ onSelectTicket }) {
  const [twin, setTwin] = useState(null);
  const [activeTab, setActiveTab] = useState('INVENTORY');

  // Trigger form state
  const [transferFromBin, setTransferFromBin] = useState('W1');
  const [transferToBin, setTransferToBin] = useState('W2');
  const [transferQty, setTransferQty] = useState(100);
  const [isSubmittingTrigger, setIsSubmittingTrigger] = useState(false);
  const [latestIncidentCard, setLatestIncidentCard] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetchDigitalTwin()
        .then((data) => {
          if (!cancelled) setTwin(data);
        })
        .catch(() => {});
    load();
    const interval = setInterval(load, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const handleExecuteBinTransfer = async (e) => {
    e.preventDefault();
    setIsSubmittingTrigger(true);
    try {
      const payload = {
        text: `Bin transfer execution failure ERR_STOCK_NEG: Attempted transfer of ${transferQty} units of SKU SK-902 (Industrial Motor Assembly) from Bin ${transferFromBin} (Available: 84 units) to Bin ${transferToBin} in Warehouse WH-A. Stock constraint stock_qty >= 0 breached.`,
        reporter: 'ERP Operator (John Doe)',
        erp_context: {
          erp: 'Smart Manufacturing ERP',
          module: 'INVENTORY',
          route: '/inventory/bin-transfers',
          record_id: 'BIN-TX-2026-904',
          warehouse: 'WH-A',
          bin_from: transferFromBin,
          bin_to: transferToBin,
          sku: 'SK-902',
          qty: transferQty
        }
      };

      const ticket = await ingestIncident(payload);
      setLatestIncidentCard(ticket);
    } catch (err) {
      alert(`ERP Transaction Failure: ${err.message}`);
    } finally {
      setIsSubmittingTrigger(false);
    }
  };

  const handleTriggerPresetScenario = async (scenarioType) => {
    setIsSubmittingTrigger(true);
    try {
      let payload = {};
      if (scenarioType === 'ERR_ORDER_SYNC') {
        payload = {
          text: `Sales Order #SO-1092 synchronization timeout ERR_ORDER_SYNC to warehouse delivery queue. Gateway socket connection closed after 3000ms SLA breach.`,
          reporter: 'Sales Desk (Emma Watson)',
          erp_context: { erp: 'Smart Manufacturing ERP', module: 'ORDERS', record_id: 'SO-1092', customer: 'Acme Corp' }
        };
      } else if (scenarioType === 'ERR_MACHINE_HEALTH') {
        payload = {
          text: `Machine telemetry failure ERR_MACHINE_HEALTH for CNC-Rotary-04 on Assembly Line 1. Sensor temperature spiked to 94.2°C and IoT MQTT collector buffer overrun.`,
          reporter: 'Shop Floor Supervisor (Carlos Ruiz)',
          erp_context: { erp: 'Smart Manufacturing ERP', module: 'PRODUCTION', record_id: 'CNC-Rotary-04', line: 'LINE-01' }
        };
      } else if (scenarioType === 'ERR_PO_VALIDATION') {
        payload = {
          text: `Purchase Order PO-9041 validation exception ERR_PO_VALIDATION. Vendor Apex Engineering VAT registration ID null during schema check.`,
          reporter: 'Procurement Officer (David Kim)',
          erp_context: { erp: 'Smart Manufacturing ERP', module: 'PROCUREMENT', record_id: 'PO-9041', supplier: 'Apex Engineering' }
        };
      }

      const ticket = await ingestIncident(payload);
      setLatestIncidentCard(ticket);
    } catch (err) {
      alert(`Trigger failed: ${err.message}`);
    } finally {
      setIsSubmittingTrigger(false);
    }
  };

  const nodes = (twin?.nodes || []).map((n) => ({
    id: n.id,
    position: NODE_POSITIONS[n.id] || { x: 0, y: 0 },
    data: { label: `${n.label}\n${n.open_incidents} open · ${n.failure_prediction_percentage}% risk` },
    style: {
      ...(HEALTH_STYLE[n.health] || {}),
      borderRadius: '14px',
      padding: '14px',
      fontWeight: 'bold',
      fontSize: '12px',
      whiteSpace: 'pre-line',
      textAlign: 'center',
      minWidth: 160
    }
  }));

  const edges = (twin?.edges || []).map((e) => ({
    id: `e-${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    animated: true,
    style: { stroke: '#2563EB', strokeWidth: 2 }
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="surface p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="badge-module">
                <Map className="w-3.5 h-3.5 inline mr-1" /> Smart Manufacturing ERP Console
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300">
                Active Operational State
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-heading">Live Enterprise Manufacturing & Operations</h2>
            <p className="text-body-color text-sm mt-1">
              Real-time inventory bins, order processing, shop floor telemetry, and direct ERP ↔ IncidentAI transaction triggers.
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Topology + Live Incident Trigger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: ReactFlow Topology */}
        <div className="lg:col-span-2 surface p-4 flex flex-col h-[520px]">
          <div className="flex items-center justify-between mb-3 px-2">
            <h3 className="text-sm font-bold text-heading flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent-color" /> ERP Module Dependency Topology
            </h3>
            <span className="text-xs text-muted-color">Auto-refreshing 8s</span>
          </div>
          <div className="flex-1 w-full overflow-hidden relative rounded-xl border border-border">
            {nodes.length > 0 ? (
              <ReactFlow nodes={nodes} edges={edges} fitView>
                <Background color="#CBD5E1" gap={16} size={1} />
                <Controls className="!bg-white !border !border-slate-200 !text-slate-700 !rounded-xl" />
              </ReactFlow>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-color text-sm gap-2">
                <Sparkles className="w-4 h-4 animate-spin" /> Loading topology map...
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Live ERP Incident Trigger Form */}
        <div className="surface p-5 space-y-5 flex flex-col justify-between">
          <div>
            {/* DEMO ONLY Banner */}
            <div
              className="mb-4 px-3 py-2 rounded-lg text-xs font-mono font-bold flex items-center justify-between"
              style={{
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.3)',
                color: '#f59e0b'
              }}
            >
              <span>🎬 DEMO SCENARIO CONTROLS</span>
              <span className="text-[10px] font-normal text-amber-400/70">Triggers real IncidentAI ingestion</span>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-extrabold text-heading">Interactive ERP Incident Trigger</h3>
            </div>
            <p className="text-xs text-muted-color mb-4">
              Simulate operational ERP transactions. Triggering a stock breach or timeout instantly ingests a ticket into IncidentAI with full context.
            </p>

            {/* Form: Inventory Bin Transfer simulation */}
            <form onSubmit={handleExecuteBinTransfer} className="space-y-3 p-4 rounded-xl border border-border bg-subtle">
              <div className="flex items-center justify-between text-xs font-bold text-heading mb-1">
                <span>Warehouse Bin Transfer</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono">
                  WH-A / SK-902
                </span>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-color block mb-1">Product SKU</label>
                <input
                  type="text"
                  disabled
                  value="Industrial Motor Assembly (SKU: SK-902)"
                  className="input-field w-full text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-muted-color block mb-1">From Bin (Avail: 84)</label>
                  <select
                    value={transferFromBin}
                    onChange={(e) => setTransferFromBin(e.target.value)}
                    className="input-field w-full text-xs"
                  >
                    <option value="W1">Bin W1 (84 available)</option>
                    <option value="W2">Bin W2 (12 available)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-color block mb-1">To Destination Bin</label>
                  <select
                    value={transferToBin}
                    onChange={(e) => setTransferToBin(e.target.value)}
                    className="input-field w-full text-xs"
                  >
                    <option value="W2">Bin W2</option>
                    <option value="B4">Bin B4</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-medium text-muted-color">Transfer Quantity</label>
                  <span className="text-[10px] text-rose-500 font-bold">100 &gt; 84 (Over stock limit!)</span>
                </div>
                <input
                  type="number"
                  value={transferQty}
                  onChange={(e) => setTransferQty(Number(e.target.value))}
                  className="input-field w-full text-xs font-mono font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingTrigger}
                className="btn-primary w-full text-xs py-2 justify-center mt-2"
              >
                {isSubmittingTrigger ? (
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Execute Bin Transfer (Triggers ERR_STOCK_NEG)
                  </>
                )}
              </button>
            </form>

            {/* Quick Trigger Presets for Other Modules */}
            <div className="mt-4 pt-4 border-t border-border">
              <span className="text-[11px] font-semibold text-muted-color block mb-2">Other Operational Triggers:</span>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleTriggerPresetScenario('ERR_ORDER_SYNC')}
                  className="w-full text-left p-2 rounded-lg border border-border hover:border-accent-color text-xs flex items-center justify-between transition-colors"
                >
                  <span className="font-medium text-heading">Sales Order #SO-1092 Sync Timeout</span>
                  <span className="badge-p1">P1</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTriggerPresetScenario('ERR_MACHINE_HEALTH')}
                  className="w-full text-left p-2 rounded-lg border border-border hover:border-accent-color text-xs flex items-center justify-between transition-colors"
                >
                  <span className="font-medium text-heading">CNC-Rotary-04 Telemetry Spike</span>
                  <span className="badge-p0">P0</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTriggerPresetScenario('ERR_PO_VALIDATION')}
                  className="w-full text-left p-2 rounded-lg border border-border hover:border-accent-color text-xs flex items-center justify-between transition-colors"
                >
                  <span className="font-medium text-heading">Apex PO-9041 Schema Validation</span>
                  <span className="badge-p2">P2</span>
                </button>
              </div>
            </div>
          </div>

          {/* Triggered Incident Status Card */}
          {latestIncidentCard && (
            <div className="p-4 rounded-xl border border-accent-color bg-accent-subtle-bg space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-accent-color flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Incident Ingested to IncidentAI
                </span>
                <span className={`${
                  latestIncidentCard.severity === 'P0_CRITICAL' ? 'badge-p0'
                  : latestIncidentCard.severity === 'P1_HIGH' ? 'badge-p1'
                  : latestIncidentCard.severity === 'P2_MEDIUM' ? 'badge-p2'
                  : 'badge-p3'
                }`}>{latestIncidentCard.severity?.split('_')[0]}</span>
              </div>
              <p className="text-xs font-extrabold text-heading line-clamp-1">{latestIncidentCard.title}</p>
              <div className="text-[11px] text-muted-color space-y-1 font-mono">
                <div>ID: <strong className="text-heading">{latestIncidentCard.ticket_number || latestIncidentCard.id}</strong></div>
                <div>Assigned Dev: <strong>{latestIncidentCard.assigned_dev_name || 'Marcus Vance'}</strong></div>
                <div>Status: <strong className="text-amber-600">{latestIncidentCard.status}</strong></div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSelectTicket && onSelectTicket(latestIncidentCard.id)}
                  className="btn-primary text-xs flex-1 py-1.5 justify-center"
                >
                  Open in IncidentAI <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </button>
                <button
                  onClick={() => setLatestIncidentCard(null)}
                  className="btn-secondary text-xs py-1.5 px-2"
                  title="Clear"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Active ERP Manufacturing Data Tables */}
      <div className="surface p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-accent-color" />
            <h3 className="text-base font-extrabold text-heading">Active Manufacturing Enterprise Master Records</h3>
          </div>

          {/* Module Tabs */}
          <div className="flex gap-2">
            {[
              { id: 'INVENTORY', label: 'Inventory & Bins', icon: Package },
              { id: 'ORDERS', label: 'Sales & Orders', icon: ShoppingCart },
              { id: 'PRODUCTION', label: 'Shop Floor & Telemetry', icon: Cpu },
              { id: 'PROCUREMENT', label: 'Procurement & POs', icon: FileCheck }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    isActive
                      ? 'bg-accent-color text-white'
                      : 'bg-subtle text-muted-color hover:text-heading hover:bg-muted'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab 1: INVENTORY TABLE */}
        {activeTab === 'INVENTORY' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-subtle text-muted-color border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Warehouse</th>
                  <th className="py-2.5 px-3">Bin Location</th>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3 font-mono">Available Qty</th>
                  <th className="py-2.5 px-3 font-mono">Reserved Qty</th>
                  <th className="py-2.5 px-3 font-mono">Reorder Threshold</th>
                  <th className="py-2.5 px-3">Health Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="hover:bg-subtle transition-colors">
                  <td className="py-3 px-3 font-bold text-heading">WH-A</td>
                  <td className="py-3 px-3 font-mono font-bold text-accent-color">W1</td>
                  <td className="py-3 px-3">Industrial Motor Assembly</td>
                  <td className="py-3 px-3 font-mono">SK-902</td>
                  <td className="py-3 px-3 font-mono font-extrabold text-emerald-600">84</td>
                  <td className="py-3 px-3 font-mono">12</td>
                  <td className="py-3 px-3 font-mono text-muted-color">25</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">HEALTHY</span>
                  </td>
                </tr>
                <tr className="hover:bg-subtle transition-colors">
                  <td className="py-3 px-3 font-bold text-heading">WH-A</td>
                  <td className="py-3 px-3 font-mono font-bold text-accent-color">W2</td>
                  <td className="py-3 px-3">Li-Ion Battery Cell 21700</td>
                  <td className="py-3 px-3 font-mono">CELL-21700</td>
                  <td className="py-3 px-3 font-mono font-extrabold text-emerald-600">340</td>
                  <td className="py-3 px-3 font-mono">60</td>
                  <td className="py-3 px-3 font-mono text-muted-color">100</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">HEALTHY</span>
                  </td>
                </tr>
                <tr className="hover:bg-subtle transition-colors">
                  <td className="py-3 px-3 font-bold text-heading">WH-B</td>
                  <td className="py-3 px-3 font-mono font-bold text-amber-600">B4</td>
                  <td className="py-3 px-3">Turbine Controller PCB</td>
                  <td className="py-3 px-3 font-mono">PCB-TURB-01</td>
                  <td className="py-3 px-3 font-mono font-extrabold text-amber-600">18</td>
                  <td className="py-3 px-3 font-mono">15</td>
                  <td className="py-3 px-3 font-mono text-muted-color">20</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">LOW STOCK ALERT</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: ORDERS TABLE */}
        {activeTab === 'ORDERS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-subtle text-muted-color border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 font-mono">Total Amount</th>
                  <th className="py-2.5 px-3">Fulfillment Gateway Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="hover:bg-subtle transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-accent-color">SO-1092</td>
                  <td className="py-3 px-3 font-semibold text-heading">Acme Corp</td>
                  <td className="py-3 px-3">SALES_ORDER</td>
                  <td className="py-3 px-3 font-mono font-bold">$14,500.00</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1 w-max">
                      <AlertTriangle className="w-3 h-3" /> SYNC_FAILED (ERR_ORDER_SYNC)
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-subtle transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-accent-color">SO-1093</td>
                  <td className="py-3 px-3 font-semibold text-heading">Tesla Energy Supply</td>
                  <td className="py-3 px-3">SALES_ORDER</td>
                  <td className="py-3 px-3 font-mono font-bold">$48,900.00</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">PROCESSING</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: PRODUCTION TABLE */}
        {activeTab === 'PRODUCTION' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-subtle text-muted-color border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Assembly Line</th>
                  <th className="py-2.5 px-3">Machine Telemetry Node</th>
                  <th className="py-2.5 px-3 font-mono">Temperature</th>
                  <th className="py-2.5 px-3 font-mono">Vibration Sampling</th>
                  <th className="py-2.5 px-3">Active Work Order</th>
                  <th className="py-2.5 px-3">Operational Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="hover:bg-subtle transition-colors">
                  <td className="py-3 px-3 font-bold text-heading">Assembly Line 1</td>
                  <td className="py-3 px-3 font-mono font-bold text-rose-600">CNC-Rotary-04</td>
                  <td className="py-3 px-3 font-mono font-extrabold text-rose-600">94.2°C ⚠️</td>
                  <td className="py-3 px-3 font-mono">184 Hz</td>
                  <td className="py-3 px-3 font-mono text-accent-color">WO-4402</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                      TELEMETRY CRITICAL
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-subtle transition-colors">
                  <td className="py-3 px-3 font-bold text-heading">SMT Line 2</td>
                  <td className="py-3 px-3 font-mono font-bold text-emerald-600">SMT-PickPlace-01</td>
                  <td className="py-3 px-3 font-mono font-extrabold text-emerald-600">42.0°C</td>
                  <td className="py-3 px-3 font-mono">12 Hz</td>
                  <td className="py-3 px-3 font-mono text-accent-color">WO-4405</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">RUNNING</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: PROCUREMENT TABLE */}
        {activeTab === 'PROCUREMENT' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-subtle text-muted-color border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Purchase Order</th>
                  <th className="py-2.5 px-3">Supplier Name</th>
                  <th className="py-2.5 px-3 font-mono">Items Count</th>
                  <th className="py-2.5 px-3 font-mono">Total Value</th>
                  <th className="py-2.5 px-3">Submitted By</th>
                  <th className="py-2.5 px-3">Validation Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="hover:bg-subtle transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-accent-color">PO-9041</td>
                  <td className="py-3 px-3 font-semibold text-heading">Apex Engineering Ltd</td>
                  <td className="py-3 px-3 font-mono">5</td>
                  <td className="py-3 px-3 font-mono font-bold">$125,000.00</td>
                  <td className="py-3 px-3">David Kim</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                      VALIDATION_FAILED (ERR_PO_VALIDATION)
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-subtle transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-accent-color">PO-9042</td>
                  <td className="py-3 px-3 font-semibold text-heading">Global Silicon Supplies</td>
                  <td className="py-3 px-3 font-mono">12</td>
                  <td className="py-3 px-3 font-mono font-bold">$34,000.00</td>
                  <td className="py-3 px-3">Sarah Connor</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">APPROVED</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
