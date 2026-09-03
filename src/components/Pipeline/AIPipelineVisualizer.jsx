import React, { useEffect, useState } from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { GitFork, Sparkles, Cpu } from 'lucide-react';
import { fetchPipelineTrace } from '../../services/apiClient';
import { InlineLoading } from '../Common/Loading';
import IncidentLifecycleVisualizer from './IncidentLifecycleVisualizer';

const STAGE_STYLES = {
  ingest: { background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
  ocr: { background: '#ECFEFF', color: '#155E75', border: '1px solid #A5F3FC' },
  severity: { background: '#F5F3FF', color: '#5B21B6', border: '1px solid #DDD6FE' },
  duplicate: { background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' },
  knowledge: { background: '#ECFEFF', color: '#0E7490', border: '1px solid #A5F3FC' },
  routing: { background: '#FFF1F2', color: '#9F1239', border: '1px solid #FECDD3' },
  ticket: { background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }
};

export default function AIPipelineVisualizer({ ticket, verificationResult }) {
  const [pipeline, setPipeline] = useState(null);
  const [isLoadingTrace, setIsLoadingTrace] = useState(false);
  const [activeTab, setActiveTab] = useState('LIFECYCLE'); // 'LIFECYCLE' | 'TECHNICAL'

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
      {/* ── Visual View Toggle Tabs ── */}
      <div className="flex items-center justify-between gap-4 surface p-4 rounded-xl border border-[var(--border)]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('LIFECYCLE')}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold flex items-center gap-2 transition-all ${
              activeTab === 'LIFECYCLE'
                ? 'bg-accent-color text-white shadow-sm'
                : 'text-muted-color hover:text-heading hover:bg-subtle'
            }`}
          >
            <GitFork className="w-4 h-4" /> Incident Resolution Lifecycle
          </button>
          <button
            onClick={() => setActiveTab('TECHNICAL')}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold flex items-center gap-2 transition-all ${
              activeTab === 'TECHNICAL'
                ? 'bg-accent-color text-white shadow-sm'
                : 'text-muted-color hover:text-heading hover:bg-subtle'
            }`}
          >
            <Cpu className="w-4 h-4" /> Secondary Technical AI Processing Trace
          </button>
        </div>

        <span className="text-xs font-mono text-muted-color hidden md:inline">
          {ticket ? `Viewing Trace for ${ticket.ticket_number || ticket.id}` : 'Select a ticket to view live status'}
        </span>
      </div>

      {/* ── PRIMARY VIEW: Incident Resolution Lifecycle ── */}
      {activeTab === 'LIFECYCLE' && (
        <IncidentLifecycleVisualizer ticket={ticket} verificationResult={verificationResult} />
      )}

      {/* ── SECONDARY VIEW: Technical React Flow Diagram ── */}
      {activeTab === 'TECHNICAL' && (
        <div className="space-y-4">
          <div className="surface p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="badge-module"><GitFork className="w-3 h-3 inline mr-1" /> Interactive React Flow Trace</span>
            </div>
            <h2 className="text-xl font-extrabold text-heading">Live AI Technical Processing Chain</h2>
            <p className="text-body-color text-sm mt-1">
              {ticket
                ? <>Actual backend execution trace for <span className="text-accent-color font-mono">{ticket.ticket_number || ticket.id}</span> — showing microservice execution latency.</>
                : 'Select a ticket from the Incident Queue to view execution trace data.'}
            </p>
          </div>

          <div className="surface h-[480px] w-full overflow-hidden relative">
            {nodes.length > 0 ? (
              <ReactFlow nodes={nodes} edges={edges} fitView>
                <Background color="#CBD5E1" gap={16} size={1} />
                <Controls className="!bg-white !border !border-slate-200 !text-slate-700 !rounded-xl" />
              </ReactFlow>
            ) : isLoadingTrace ? (
              <div className="w-full h-full flex items-center justify-center">
                <InlineLoading label="Fetching execution trace..." className="text-sm" />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-color text-sm gap-2">
                <Sparkles className="w-4 h-4" /> {ticket ? 'No trace data found for this ticket.' : 'No ticket selected.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

