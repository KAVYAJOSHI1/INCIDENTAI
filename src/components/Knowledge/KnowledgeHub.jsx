import React, { useEffect, useState } from 'react';
import { BookOpen, Search, Sparkles, Tag, Plus, CheckCircle2 } from 'lucide-react';
import { searchKnowledge } from '../../services/apiClient';
import { Spinner } from '../Common/Loading';
import EmptyState from '../Common/EmptyState';

export default function KnowledgeHub({ knowledgeBase, onAddArticle }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [showAddForm, setShowAddForm] = useState(false);
  const [remoteResults, setRemoteResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newModule, setNewModule] = useState('INVOICING');
  const [newErrorCode, setNewErrorCode] = useState('');
  const [newSolution, setNewSolution] = useState('');

  useEffect(() => {
    if (!searchQuery) {
      setRemoteResults(null);
      setIsSearching(false);
      return undefined;
    }
    let cancelled = false;
    setIsSearching(true);
    const debounce = setTimeout(() => {
      searchKnowledge(searchQuery, selectedModule === 'ALL' ? '' : selectedModule)
        .then((results) => { if (!cancelled) setRemoteResults(results); })
        .catch(() => { if (!cancelled) setRemoteResults([]); })
        .finally(() => { if (!cancelled) setIsSearching(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(debounce); };
  }, [searchQuery, selectedModule]);

  const searchResults = remoteResults ?? knowledgeBase.map((article) => ({ article, confidence_percentage: Math.round((article.confidence || 0.95) * 100) }));

  const filteredArticles = searchResults.filter(item => {
    if (selectedModule === 'ALL') return true;
    return item.article.erp_module === selectedModule;
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle || !newSolution) return;
    await onAddArticle({
      title: newTitle,
      erp_module: newModule,
      error_code: newErrorCode || 'ERR_CUSTOM',
      solution: newSolution,
      confidence: 0.98,
      tags: [newModule, newErrorCode || 'Custom']
    });
    setNewTitle('');
    setNewSolution('');
    setShowAddForm(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Banner */}
      <div className="glass-panel p-6 border-cyan-500/30 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/30 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Module 5: RAG Vector Knowledge Base
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-white">ERP Resolution & Documentation Vector Hub</h2>
          <p className="text-slate-400 text-sm mt-1">
            Indexed historical tickets, SOP runbooks, and verified resolution articles.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary text-xs"
        >
          <Plus className="w-4 h-4" /> Add Knowledge Article
        </button>
      </div>

      {/* Add Form Drawer */}
      {showAddForm && (
        <form onSubmit={handleCreate} className="glass-panel p-5 space-y-4 border-cyan-500/40 bg-cyan-950/20">
          <h3 className="text-sm font-bold text-white">Create Verified Knowledge Base Resolution</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Article Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-white"
              required
            />
            <select
              value={newModule}
              onChange={(e) => setNewModule(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-white"
            >
              <option value="INVOICING">INVOICING</option>
              <option value="PAYROLL">PAYROLL</option>
              <option value="INVENTORY">INVENTORY</option>
              <option value="GENERAL_LEDGER">GENERAL_LEDGER</option>
            </select>
            <input
              type="text"
              placeholder="Error Code e.g. ERR_TAX_VAL_402"
              value={newErrorCode}
              onChange={(e) => setNewErrorCode(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-white"
            />
          </div>
          <textarea
            placeholder="Detailed resolution steps or SQL fix..."
            value={newSolution}
            onChange={(e) => setNewSolution(e.target.value)}
            className="w-full h-24 bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-white resize-none"
            required
          />
          <button type="submit" className="btn-emerald text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" /> Save Article to RAG Index
          </button>
        </form>
      )}

      {/* Search & Filter Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 relative min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search RAG vector index for error codes, stack trace phrases, or solutions..."
            className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-9 pr-9 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          {isSearching && <Spinner className="w-3.5 h-3.5 absolute right-3 top-3" />}
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-white/10 text-xs">
          {['ALL', 'INVOICING', 'PAYROLL', 'INVENTORY', 'GENERAL_LEDGER'].map((mod) => (
            <button
              key={mod}
              onClick={() => setSelectedModule(mod)}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                selectedModule === mod
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {mod}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      {filteredArticles.length === 0 && !isSearching && (
        <EmptyState
          icon={BookOpen}
          title={searchQuery ? 'No Matching Articles' : 'No Knowledge Base Articles Yet'}
          description={searchQuery ? `No RAG results for "${searchQuery}".` : 'Add one above to start building the resolution knowledge base.'}
          compact
        />
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredArticles.map((item, idx) => {
          const art = item.article;
          return (
            <div key={idx} className="glass-panel p-5 space-y-3 border-white/10 hover:border-cyan-500/40 transition-all">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="badge-module text-[10px] mb-1 inline-block">{art.erp_module}</span>
                  <h4 className="font-bold text-white text-sm">{art.title}</h4>
                </div>
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold shrink-0">
                  {item.confidence_percentage}% Vector Score
                </span>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-white/5">
                {art.solution}
              </p>

              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {art.tags?.map((t, tIdx) => (
                  <span key={tIdx} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-white/5 font-mono">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
