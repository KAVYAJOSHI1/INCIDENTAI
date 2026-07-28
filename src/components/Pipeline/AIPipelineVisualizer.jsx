import React, { useEffect, useState } from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { GitFork, Sparkles } from 'lucide-react';
import { fetchPipelineTrace } from '../../services/apiClient';
import { InlineLoading } from '../Common/Loading';

const STAGE_STYLES = {
  ingest: { background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
  ocr: { background: '#ECFEFF', color: '#155E75', border: '1px solid #A5F3FC' },
  severity: { background: '#F5F3FF', color: '#5B21B6', border: '1px solid #DDD6FE' },
  duplicate: { background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' },
  knowledge: { background: '#ECFEFF', color: '#0E7490', border: '1px solid #A5F3FC' },
  routing: { background: '#FFF1F2', color: '#9F1239', border: '1px solid #FECDD3' },
  ticket: { background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }
};

export default function AIPipelineVisualizer({ ticket }) {
  const [pipeline, setPipeline] = useState(null);
  const [isLoadingTrace, setIsLoadingTrace] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!ticket) {
      setPipeline(null);
      setIsLoadingTrace(false);
      return undefined;
    }
    setIsLoadingTrace(true);
    fetchPipelineTrace(ticket.id)
      .then((data) => { if (!cancelled) setPipeline(data); })
      .catch(() => { if (!cancelled) setPipeline(null); })
      .finally(() => { if (!cancelled) setIsLoadingTrace(false); });
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
    style: { stroke: '#2563EB', strokeWidth: 2 }
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Banner */}
      <div className="surface p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="badge-module"><GitFork className="w-3 h-3 inline mr-1" /> Interactive React Flow Visualizer</span>
        </div>
        <h2 className="text-xl font-extrabold text-heading">Live AI Execution Pipeline Diagram</h2>
        <p className="text-body-color text-sm mt-1">
          {ticket
            ? <>Actual backend execution trace for <span className="text-accent-color font-mono">{ticket.ticket_number}</span> — from multimodal ingestion through developer routing.</>
            : 'Select a ticket from the Support Triage Feed to see its real AI execution trace.'}
        </p>
      </div>

      {/* React Flow Graph Window */}
      <div className="surface h-[480px] w-full overflow-hidden relative">
        {nodes.length > 0 ? (
          <ReactFlow nodes={nodes} edges={edges} fitView>
            <Background color="#CBD5E1" gap={16} size={1} />
            <Controls className="!bg-white !border !border-slate-200 !text-slate-700 !rounded-xl" />
          </ReactFlow>
        ) : isLoadingTrace ? (
          <div className="w-full h-full flex items-center justify-center">
            <InlineLoading label="Fetching real execution trace..." className="text-sm" />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-color text-sm gap-2">
            <Sparkles className="w-4 h-4" /> {ticket ? 'No pipeline trace found for this ticket.' : 'No ticket selected — pick one from the Support Triage Feed.'}
          </div>
        )}
      </div>
    </div>
  );
}
