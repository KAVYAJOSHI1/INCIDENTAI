import React, { useEffect, useState } from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Map, Sparkles } from 'lucide-react';
import { fetchDigitalTwin } from '../../services/apiClient';

const HEALTH_STYLE = {
  RED: { background: '#4C0519', color: '#FECDD3', border: '2px solid #F43F5E' },
  YELLOW: { background: '#451A03', color: '#FCD34D', border: '2px solid #F59E0B' },
  GREEN: { background: '#022C22', color: '#6EE7B7', border: '2px solid #10B981' }
};

const NODE_POSITIONS = {
  INVOICING: { x: 60, y: 40 },
  PAYROLL: { x: 60, y: 220 },
  INVENTORY: { x: 60, y: 400 },
  PROCUREMENT: { x: 380, y: 400 },
  GENERAL_LEDGER: { x: 680, y: 220 }
};

export default function DigitalTwin() {
  const [twin, setTwin] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => fetchDigitalTwin().then((data) => { if (!cancelled) setTwin(data); }).catch(() => {});
    load();
    const interval = setInterval(load, 8000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const nodes = (twin?.nodes || []).map((n) => ({
    id: n.id,
    position: NODE_POSITIONS[n.id] || { x: 0, y: 0 },
    data: { label: `${n.label}\n${n.open_incidents} open · ${n.failure_prediction_percentage}% failure risk` },
    style: { ...(HEALTH_STYLE[n.health] || {}), borderRadius: '14px', padding: '14px', fontWeight: 'bold', fontSize: '12px', whiteSpace: 'pre-line', textAlign: 'center', minWidth: 160 }
  }));

  const edges = (twin?.edges || []).map((e) => ({
    id: `e-${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    animated: true,
    style: { stroke: '#6366F1', strokeWidth: 2 }
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="glass-panel p-6 border-indigo-500/30">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30 flex items-center gap-1">
            <Map className="w-3.5 h-3.5 text-indigo-400" /> Enterprise Feature 7: Digital Twin
          </span>
        </div>
        <h2 className="text-xl font-extrabold text-white">ERP Digital Twin System Topology</h2>
        <p className="text-slate-400 text-sm mt-1">Live interconnected module map with health status and failure prediction.</p>
      </div>

      <div className="glass-panel h-[520px] w-full rounded-2xl overflow-hidden border border-white/10 relative">
        {nodes.length > 0 ? (
          <ReactFlow nodes={nodes} edges={edges} fitView>
            <Background color="#334155" gap={16} size={1} />
            <Controls className="bg-slate-900 border border-white/10 text-white fill-white rounded-xl" />
          </ReactFlow>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm gap-2">
            <Sparkles className="w-4 h-4" /> Loading topology...
          </div>
        )}
      </div>
    </div>
  );
}
