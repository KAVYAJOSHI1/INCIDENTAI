import React from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { GitFork, Sparkles } from 'lucide-react';

export default function AIPipelineVisualizer() {
  const initialNodes = [
    {
      id: '1',
      position: { x: 50, y: 120 },
      data: { label: '1. Multimodal Input\n(Screenshot / PDF / Log / Voice)' },
      style: { background: '#1E1B4B', color: '#A5B4FC', border: '1px solid #6366F1', borderRadius: '12px', padding: '12px', fontWeight: 'bold', fontSize: '12px' }
    },
    {
      id: '2',
      position: { x: 280, y: 120 },
      data: { label: '2. PaddleOCR + Vision AI\n(Bounding Box & Code Symbol Extractor)' },
      style: { background: '#0F172A', color: '#38BDF8', border: '1px solid #06B6D4', borderRadius: '12px', padding: '12px', fontWeight: 'bold', fontSize: '12px' }
    },
    {
      id: '3',
      position: { x: 540, y: 50 },
      data: { label: '3. pgvector RAG Engine\n(85% Duplicate & Solution Search)' },
      style: { background: '#022C22', color: '#6EE7B7', border: '1px solid #10B981', borderRadius: '12px', padding: '12px', fontWeight: 'bold', fontSize: '12px' }
    },
    {
      id: '4',
      position: { x: 540, y: 190 },
      data: { label: '4. Jira Ticket AI\n(Title, Steps, Severity P0-P3)' },
      style: { background: '#2E1065', color: '#DDD6FE', border: '1px solid #8B5CF6', borderRadius: '12px', padding: '12px', fontWeight: 'bold', fontSize: '12px' }
    },
    {
      id: '5',
      position: { x: 810, y: 120 },
      data: { label: '5. Developer Load Router\n(Skill Match x Capacity Gauge)' },
      style: { background: '#4C0519', color: '#FECDD3', border: '1px solid #F43F5E', borderRadius: '12px', padding: '12px', fontWeight: 'bold', fontSize: '12px' }
    }
  ];

  const initialEdges = [
    { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#6366F1', strokeWidth: 2 } },
    { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#06B6D4', strokeWidth: 2 } },
    { id: 'e2-4', source: '2', target: '4', animated: true, style: { stroke: '#06B6D4', strokeWidth: 2 } },
    { id: 'e3-5', source: '3', target: '5', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
    { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: '#8B5CF6', strokeWidth: 2 } }
  ];

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
          Visual representation of how IncidentAI processes incoming raw ERP data into structured developer assignments.
        </p>
      </div>

      {/* React Flow Graph Window */}
      <div className="glass-panel h-[480px] w-full rounded-2xl overflow-hidden border border-white/10 relative">
        <ReactFlow nodes={initialNodes} edges={initialEdges} fitView>
          <Background color="#334155" gap={16} size={1} />
          <Controls className="bg-slate-900 border border-white/10 text-white fill-white rounded-xl" />
        </ReactFlow>
      </div>
    </div>
  );
}
