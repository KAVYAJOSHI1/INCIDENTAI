import React, { useEffect, useState, useCallback } from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Map, Sparkles, Package, ShoppingCart, Cpu, FileCheck, AlertTriangle,
  RefreshCw, Send, Layers, CheckCircle2, ExternalLink, Database, Radio
} from 'lucide-react';
import {
  fetchDigitalTwin, fetchErpInventory, fetchErpMasterData,
  fetchErpTransactions, executeBinTransfer
} from '../../services/apiClient';
import DemoScenarioPanel from './DemoScenarioPanel';

const HEALTH_STYLE = {
  RED: { background: '#FFF1F2', color: '#9F1239', border: '2px solid #FDA4AF' },
  YELLOW: { background: '#FFFBEB', color: '#92400E', border: '2px solid #FCD34D' },
  GREEN: { background: '#ECFDF5', color: '#065F46', border: '2px solid #6EE7B7' }
};

const NODE_POSITIONS = {
  INVOICING: { x: 60, y: 40 }, PAYROLL: { x: 60, y: 220 }, INVENTORY: { x: 60, y: 400 },
  PROCUREMENT: { x: 380, y: 400 }, GENERAL_LEDGER: { x: 680, y: 220 },
  PRODUCTION: { x: 380, y: 40 }, ORDERS: { x: 680, y: 40 }
};

const money = (n) => `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function DigitalTwin({ onSelectTicket }) {
  const [twin, setTwin] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [masterData, setMasterData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('INVENTORY');

  // Transfer form
  const [sku, setSku] = useState('SK-902');
  const [fromBin, setFromBin] = useState('W1');
  const [toBin, setToBin] = useState('W2');
  const [qty, setQty] = useState(100);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { status, incident?, message }

  const loadErp = useCallback(async () => {
    const [inv, md, tx] = await Promise.all([
      fetchErpInventory().catch(() => null),
      fetchErpMasterData().catch(() => null),
      fetchErpTransactions(8).catch(() => [])
    ]);
    if (inv) setInventory(inv.inventory || []);
    if (md) setMasterData(md);
    if (tx) setTransactions(tx);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadTopology = () => fetchDigitalTwin().then((d) => { if (!cancelled) setTwin(d); }).catch(() => {});
    loadTopology();
    loadErp();
    const interval = setInterval(() => { loadTopology(); loadErp(); }, 8000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [loadErp]);

  // Bins that actually hold the selected SKU, from live data
  const skuRows = inventory.filter((r) => r.sku === sku);
  const skus = [...new Set(inventory.map((r) => r.sku))];
  const fromRow = inventory.find((r) => r.sku === sku && r.bin === fromBin);
  const available = fromRow ? fromRow.available_qty : null;
  const overLimit = available != null && Number(qty) > available;

  const handleTransfer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await executeBinTransfer({ sku, from_bin: fromBin, to_bin: toBin, qty: Number(qty) });
      setResult(res);
      await loadErp();
    } catch (err) {
      setResult({ status: 'ERROR', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const nodes = (twin?.nodes || []).map((n) => ({
    id: n.id,
    position: NODE_POSITIONS[n.id] || { x: 0, y: 0 },
    data: { label: `${n.label}\n${n.open_incidents} open · ${n.failure_prediction_percentage}% risk` },
    style: {
      ...(HEALTH_STYLE[n.health] || {}),
      borderRadius: '14px', padding: '14px', fontWeight: 'bold', fontSize: '12px',
      whiteSpace: 'pre-line', textAlign: 'center', minWidth: 160
    }
  }));
  const edges = (twin?.edges || []).map((e) => ({
    id: `e-${e.source}-${e.target}`, source: e.source, target: e.target,
    animated: true, style: { stroke: '#2563EB', strokeWidth: 2 }
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="surface p-6">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="badge-module"><Map className="w-3.5 h-3.5 inline mr-1" /> Smart Manufacturing ERP — Embedded Console</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 flex items-center gap-1">
            <Radio className="w-3 h-3" /> LIVE INTEGRATION
          </span>
        </div>
        <h2 className="text-2xl font-extrabold text-heading">ERP Operational State &amp; Incident Triggers</h2>
        <p className="text-body-color text-sm mt-1">
          Inventory is <strong>real, mutable database state</strong>. Every operation is validated against live stock and either
          commits to the DB or is rejected and ingested as a persisted IncidentAI incident. Orders, telemetry and procurement
          tables below are seeded demo records served from the backend.
        </p>
      </div>

      {/* Presenter demo console — one click per realistic ERP failure + deterministic reset */}
      <DemoScenarioPanel onSelectTicket={onSelectTicket} onAfterChange={loadErp} />

      {/* Topology + Trigger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 surface p-4 flex flex-col h-[520px]">
          <div className="flex items-center justify-between mb-3 px-2">
            <h3 className="text-sm font-bold text-heading flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent-color" /> ERP Module Dependency Topology
            </h3>
            <span className="text-xs text-muted-color">Auto-refreshing 8s · derived from live incidents</span>
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

        {/* Real bin-transfer form */}
        <div className="surface p-5 space-y-5 flex flex-col">
          <div>
            <div className="mb-4 px-3 py-2 rounded-lg text-xs font-mono font-bold flex items-center justify-between"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', color: '#059669' }}>
              <span>⚙ REAL ERP PROCESSING</span>
              <span className="text-[10px] font-normal opacity-70">Validated against live DB stock</span>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-extrabold text-heading">Warehouse Bin Transfer</h3>
              <span className="text-[10px] font-mono text-muted-color px-1.5 py-0.5 rounded bg-subtle border border-[var(--border)]">MANUAL / ADVANCED</span>
            </div>
            <p className="text-xs text-muted-color mb-4">
              Fine-grained control over the inventory transfer used by the "Negative Stock" demo scenario. If the quantity
              exceeds live available stock the ERP rejects it and IncidentAI ingests a persisted incident. A valid quantity
              mutates the database.
            </p>

            <form onSubmit={handleTransfer} className="space-y-3 p-4 rounded-xl border border-border bg-subtle">
              <div>
                <label className="text-[11px] font-medium text-muted-color block mb-1">Product SKU</label>
                <select value={sku} onChange={(e) => { setSku(e.target.value); }} className="input-field w-full text-xs font-semibold">
                  {skus.map((s) => {
                    const nm = inventory.find((r) => r.sku === s)?.product_name || s;
                    return <option key={s} value={s}>{nm} ({s})</option>;
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-muted-color block mb-1">
                    From Bin {available != null && <span className="text-emerald-600 font-bold">(avail {available})</span>}
                  </label>
                  <select value={fromBin} onChange={(e) => setFromBin(e.target.value)} className="input-field w-full text-xs">
                    {skuRows.map((r) => <option key={r.bin} value={r.bin}>Bin {r.bin} ({r.available_qty} avail)</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-color block mb-1">To Bin</label>
                  <select value={toBin} onChange={(e) => setToBin(e.target.value)} className="input-field w-full text-xs">
                    {['W1', 'W2', 'B4'].filter((b) => b !== fromBin).map((b) => <option key={b} value={b}>Bin {b}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-medium text-muted-color">Transfer Quantity</label>
                  {overLimit && <span className="text-[10px] text-rose-500 font-bold">{qty} &gt; {available} — over live stock</span>}
                  {!overLimit && available != null && <span className="text-[10px] text-emerald-600 font-bold">{qty} ≤ {available} — valid</span>}
                </div>
                <input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))}
                  className="input-field w-full text-xs font-mono font-bold" />
              </div>

              <button type="submit" disabled={submitting || !fromRow}
                className={`btn-primary w-full text-xs py-2 justify-center mt-2 ${overLimit ? 'bg-rose-600 hover:bg-rose-500' : ''}`}>
                {submitting ? <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  : <><Send className="w-3.5 h-3.5" /> {overLimit ? 'Execute (will be rejected)' : 'Execute Transfer'}</>}
              </button>
            </form>
          </div>

          {/* Result card */}
          {result && result.status === 'REJECTED' && result.incident && (
            <div className="p-4 rounded-xl border border-rose-400 bg-rose-500/10 space-y-2">
              <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> ERP transaction REJECTED — incident persisted
              </span>
              <p className="text-xs text-body-color">{result.message}</p>
              <div className="text-[11px] text-muted-color space-y-1 font-mono">
                <div>Incident: <strong className="text-heading">{result.incident.ticket_number}</strong></div>
                <div>Correlation: <strong>{result.incident.correlation_id}</strong></div>
                <div>Assigned: <strong>{result.incident.assigned_dev_name || '—'}</strong> · Status: <strong className="text-amber-600">{result.incident.status}</strong></div>
              </div>
              <button onClick={() => onSelectTicket && onSelectTicket(result.incident.id)}
                className="btn-primary text-xs w-full py-1.5 justify-center">
                Open in IncidentAI <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>
          )}
          {result && result.status === 'COMPLETED' && (
            <div className="p-4 rounded-xl border border-emerald-400 bg-emerald-500/10 space-y-1.5">
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> ERP transaction COMPLETED — database updated
              </span>
              <p className="text-xs text-body-color">{result.message}</p>
              <p className="text-[10px] text-muted-color font-mono">Refresh the page — the new quantities persist.</p>
            </div>
          )}
          {result && result.status === 'ERROR' && (
            <div className="p-3 rounded-xl border border-rose-400 bg-rose-500/10 text-xs text-rose-600">{result.message}</div>
          )}
        </div>
      </div>

      {/* Master data tables (backend-served) */}
      <div className="surface p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-accent-color" />
            <h3 className="text-base font-extrabold text-heading">ERP Master Records</h3>
            {activeTab === 'INVENTORY' ? (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <Database className="w-3 h-3" /> LIVE DB STATE
              </span>
            ) : (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                SEEDED DISPLAY DATA
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'INVENTORY', label: 'Inventory & Bins', icon: Package },
              { id: 'ORDERS', label: 'Sales & Orders', icon: ShoppingCart },
              { id: 'PRODUCTION', label: 'Shop Floor', icon: Cpu },
              { id: 'PROCUREMENT', label: 'Procurement', icon: FileCheck }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    activeTab === tab.id ? 'bg-accent-color text-white' : 'bg-subtle text-muted-color hover:text-heading hover:bg-muted'
                  }`}>
                  <Icon className="w-3.5 h-3.5" /> {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'INVENTORY' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-subtle text-muted-color border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Warehouse</th><th className="py-2.5 px-3">Bin</th>
                  <th className="py-2.5 px-3">Product</th><th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3 font-mono">Available</th><th className="py-2.5 px-3 font-mono">Reserved</th>
                  <th className="py-2.5 px-3 font-mono">Reorder At</th><th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inventory.map((r) => {
                  const low = r.available_qty <= r.reorder_threshold;
                  return (
                    <tr key={r.id} className="hover:bg-subtle transition-colors">
                      <td className="py-3 px-3 font-bold text-heading">{r.warehouse}</td>
                      <td className="py-3 px-3 font-mono font-bold text-accent-color">{r.bin}</td>
                      <td className="py-3 px-3">{r.product_name}</td>
                      <td className="py-3 px-3 font-mono">{r.sku}</td>
                      <td className={`py-3 px-3 font-mono font-extrabold ${low ? 'text-amber-600' : 'text-emerald-600'}`}>{r.available_qty}</td>
                      <td className="py-3 px-3 font-mono">{r.reserved_qty}</td>
                      <td className="py-3 px-3 font-mono text-muted-color">{r.reorder_threshold}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${low ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {low ? 'LOW STOCK' : 'HEALTHY'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {inventory.length === 0 && <tr><td colSpan={8} className="py-4 px-3 text-muted-color">Loading live inventory…</td></tr>}
              </tbody>
            </table>
            {transactions.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                <span className="text-[11px] font-semibold text-muted-color block mb-2">Recent ERP transactions (DB log):</span>
                <div className="space-y-1 font-mono text-[11px]">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between px-2 py-1 rounded bg-subtle">
                      <span>{tx.type} · {tx.sku} · {tx.from_bin}→{tx.to_bin} · {tx.qty}u</span>
                      <span className={tx.status === 'REJECTED' ? 'text-rose-500 font-bold' : 'text-emerald-600 font-bold'}>
                        {tx.status}{tx.incident_id ? ' → incident' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ORDERS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-subtle text-muted-color border-b border-border">
                <tr><th className="py-2.5 px-3">Order</th><th className="py-2.5 px-3">Customer</th><th className="py-2.5 px-3">Type</th><th className="py-2.5 px-3 font-mono">Amount</th><th className="py-2.5 px-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(masterData?.orders || []).map((o) => (
                  <tr key={o.order_id} className="hover:bg-subtle transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-accent-color">{o.order_id}</td>
                    <td className="py-3 px-3 font-semibold text-heading">{o.customer}</td>
                    <td className="py-3 px-3">{o.type}</td>
                    <td className="py-3 px-3 font-mono font-bold">{money(o.total_amount)}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${o.error_code ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'}`}>
                        {o.status}{o.error_code ? ` (${o.error_code})` : ''}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'PRODUCTION' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-subtle text-muted-color border-b border-border">
                <tr><th className="py-2.5 px-3">Line</th><th className="py-2.5 px-3">Node</th><th className="py-2.5 px-3 font-mono">Temp</th><th className="py-2.5 px-3 font-mono">Vibration</th><th className="py-2.5 px-3">Work Order</th><th className="py-2.5 px-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(masterData?.production || []).map((p) => (
                  <tr key={p.node} className="hover:bg-subtle transition-colors">
                    <td className="py-3 px-3 font-bold text-heading">{p.line}</td>
                    <td className={`py-3 px-3 font-mono font-bold ${p.error_code ? 'text-rose-600' : 'text-emerald-600'}`}>{p.node}</td>
                    <td className={`py-3 px-3 font-mono font-extrabold ${p.temperature_c > 80 ? 'text-rose-600' : 'text-emerald-600'}`}>{p.temperature_c}°C</td>
                    <td className="py-3 px-3 font-mono">{p.vibration_hz} Hz</td>
                    <td className="py-3 px-3 font-mono text-accent-color">{p.work_order}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.error_code ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'PROCUREMENT' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-subtle text-muted-color border-b border-border">
                <tr><th className="py-2.5 px-3">PO</th><th className="py-2.5 px-3">Supplier</th><th className="py-2.5 px-3 font-mono">Items</th><th className="py-2.5 px-3 font-mono">Value</th><th className="py-2.5 px-3">Submitted By</th><th className="py-2.5 px-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(masterData?.procurement || []).map((po) => (
                  <tr key={po.po} className="hover:bg-subtle transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-accent-color">{po.po}</td>
                    <td className="py-3 px-3 font-semibold text-heading">{po.supplier}</td>
                    <td className="py-3 px-3 font-mono">{po.items}</td>
                    <td className="py-3 px-3 font-mono font-bold">{money(po.total_value)}</td>
                    <td className="py-3 px-3">{po.submitted_by}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${po.error_code ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {po.status}{po.error_code ? ` (${po.error_code})` : ''}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
