import React, { useEffect, useState } from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Map, Sparkles } from 'lucide-react';
import { fetchDigitalTwin } from '../../services/apiClient';

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
    style: { stroke: '#2563EB', strokeWidth: 2 }
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="surface p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="badge-module"><Map className="w-3 h-3 inline mr-1" /> Digital Twin</span>
        </div>
        <h2 className="text-xl font-extrabold text-heading">ERP Digital Twin System Topology</h2>
        <p className="text-body-color text-sm mt-1">Live interconnected module map with health status and failure prediction.</p>
      </div>

      <div className="surface h-[520px] w-full overflow-hidden relative">
        {nodes.length > 0 ? (
          <ReactFlow nodes={nodes} edges={edges} fitView>
            <Background color="#CBD5E1" gap={16} size={1} />
            <Controls className="!bg-white !border !border-slate-200 !text-slate-700 !rounded-xl" />
          </ReactFlow>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-color text-sm gap-2">
            <Sparkles className="w-4 h-4" /> Loading topology...
          </div>
        )}
      </div>
    </div>
  );
}
