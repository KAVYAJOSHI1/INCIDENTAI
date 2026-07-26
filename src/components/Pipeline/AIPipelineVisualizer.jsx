import React, { useEffect, useState } from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { GitFork, Sparkles } from 'lucide-react';
import { fetchPipelineTrace } from '../../services/apiClient';

const STAGE_STYLES = {
  ingest: { background: '#1E1B4B', color: '#A5B4FC', border: '1px solid #6366F1' },
  ocr: { background: '#0F172A', color: '#38BDF8', border: '1px solid #06B6D4' },
  severity: { background: '#2E1065', color: '#DDD6FE', border: '1px solid #8B5CF6' },
  duplicate: { background: '#022C22', color: '#6EE7B7', border: '1px solid #10B981' },
  knowledge: { background: '#083344', color: '#67E8F9', border: '1px solid #0891B2' },
  routing: { background: '#4C0519', color: '#FECDD3', border: '1px solid #F43F5E' },
  ticket: { background: '#1C1917', color: '#FDE68A', border: '1px solid #EAB308' }
};

export default function AIPipelineVisualizer({ ticket }) {
  const [pipeline, setPipeline] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!ticket) {
      setPipeline(null);
      return undefined;
    }
    fetchPipelineTrace(ticket.id)
      .then((data) => { if (!cancelled) setPipeline(data); })
      .catch(() => { if (!cancelled) setPipeline(null); });
    return () => { cancelled = true; };
  }, [ticket?.id]);

  const nodes = (pipeline?.nodes || []).map((node, idx) => ({
    id: node.id,
    position: { x: 60 + idx * 220, y: idx % 2 === 0 ? 140 : 50 },
    data: { label: `${idx + 1}. ${node.label}${node.duration_ms != null ? `\n${node.duration_ms}ms` : ''}` },
    style: { ...(STAGE_STYLES[node.id] || {}), borderRadius: '12px', padding: '12px', fontWeight: 'bold', fontSize: '12px', whiteSpace: 'pre-line' }
  }));

  const edges = (pipeline?.edges || []).map((edge) => ({
    id: `e-${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    animated: true,
    style: { stroke: '#6366F1', strokeWidth: 2 }
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Banner */}
      <div className="glass-panel p-6 border-indigo-500/30">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30 flex items-center gap-1">
            <GitFork className="w-3.5 h-3.5 text-indigo-400" /> Interactive React Flow Visualizer
          </span>
        </div>
        <h2 className="text-xl font-extrabold text-white">Live AI Execution Pipeline Diagram</h2>
        <p className="text-slate-400 text-sm mt-1">
          {ticket
            ? <>Actual backend execution trace for <span className="text-indigo-300 font-mono">{ticket.ticket_number}</span> — from multimodal ingestion through developer routing.</>
            : 'Select a ticket from the Support Triage Feed to see its real AI execution trace.'}
        </p>
      </div>

      {/* React Flow Graph Window */}
      <div className="glass-panel h-[480px] w-full rounded-2xl overflow-hidden border border-white/10 relative">
        {nodes.length > 0 ? (
          <ReactFlow nodes={nodes} edges={edges} fitView>
            <Background color="#334155" gap={16} size={1} />
            <Controls className="bg-slate-900 border border-white/10 text-white fill-white rounded-xl" />
          </ReactFlow>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm gap-2">
            <Sparkles className="w-4 h-4" /> No pipeline trace to display yet.
          </div>
        )}
      </div>
    </div>
  );
}
