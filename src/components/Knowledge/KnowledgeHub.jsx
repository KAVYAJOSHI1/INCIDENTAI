import React, { useEffect, useState } from 'react';
import { BookOpen, Search, Plus, CheckCircle2 } from 'lucide-react';
import { searchKnowledge } from '../../services/apiClient';
import { Spinner } from '../Common/Loading';
import EmptyState from '../Common/EmptyState';
import PageHeader from '../Common/PageHeader';

const MODULES = ['ALL', 'INVOICING', 'PAYROLL', 'INVENTORY', 'GENERAL_LEDGER'];

export default function KnowledgeHub({ knowledgeBase, onAddArticle }) {
  const [searchQuery, setSearchQuery]   = useState('');
  const [selectedModule, setModule]     = useState('ALL');
  const [showAddForm, setShowAddForm]   = useState(false);
  const [remoteResults, setRemoteResults] = useState(null);
  const [isSearching, setIsSearching]   = useState(false);

  const [newTitle, setNewTitle]         = useState('');
  const [newModule, setNewModule]       = useState('INVOICING');
  const [newErrorCode, setNewErrorCode] = useState('');
  const [newSolution, setNewSolution]   = useState('');

  useEffect(() => {
    if (!searchQuery) { setRemoteResults(null); setIsSearching(false); return; }
    let cancelled = false;
    setIsSearching(true);
    const timer = setTimeout(() => {
      searchKnowledge(searchQuery, selectedModule === 'ALL' ? '' : selectedModule)
        .then(r => { if (!cancelled) setRemoteResults(r); })
        .catch(()=> { if (!cancelled) setRemoteResults([]); })
        .finally(()=> { if (!cancelled) setIsSearching(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [searchQuery, selectedModule]);

  const raw = remoteResults ?? knowledgeBase.map(a => ({
    article: a,
    confidence_percentage: a.confidence ? Math.round(a.confidence * 100) : null,
  }));

  const articles = raw.filter(item =>
    selectedModule === 'ALL' || item.article.erp_module === selectedModule
  );

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle || !newSolution) return;
    await onAddArticle({
      title:      newTitle,
      erp_module: newModule,
      error_code: newErrorCode || 'ERR_CUSTOM',
      solution:   newSolution,
      confidence: 0.98,
      tags:       [newModule, newErrorCode || 'Custom'],
    });
    setNewTitle(''); setNewSolution(''); setNewErrorCode(''); setShowAddForm(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        badge="RAG Knowledge Base"
        title="ERP Resolution & Documentation Hub"
        description="Semantic vector search across historical tickets, SOP runbooks, and verified resolutions."
        action={
          <button onClick={() => setShowAddForm(f => !f)} className="btn-primary">
            <Plus className="w-3.5 h-3.5" />
            Add Article
          </button>
        }
      />

      {/* Add form */}
      {showAddForm && (
        <div className="surface">
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-sm font-semibold text-heading">Create Knowledge Base Article</p>
          </div>
          <form onSubmit={handleCreate} className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Article title"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="input-field px-3"
                style={{ height: '36px' }}
                required
              />
              <select
                value={newModule}
                onChange={e => setNewModule(e.target.value)}
                className="input-field px-3"
                style={{ height: '36px' }}
              >
                {['INVOICING', 'PAYROLL', 'INVENTORY', 'GENERAL_LEDGER'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Error code e.g. ERR_TAX_VAL_402"
                value={newErrorCode}
                onChange={e => setNewErrorCode(e.target.value)}
                className="input-field px-3"
                style={{ height: '36px' }}
              />
            </div>
            <textarea
              placeholder="Detailed resolution steps, SQL fix, or SOP…"
              value={newSolution}
              onChange={e => setNewSolution(e.target.value)}
              className="input-field w-full px-3 py-2 resize-none"
              rows={4}
              required
            />
            <div className="flex items-center gap-3">
              <button type="submit" className="btn-emerald">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Save Article
              </button>
              <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search + Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-color pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search error codes, stack phrases, resolutions…"
            className="input-field pl-9 pr-9 px-3"
            style={{ height: '36px' }}
          />
          {isSearching && <Spinner className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2" />}
        </div>

        {/* Module filter tabs */}
        <div
          className="flex items-center p-1 rounded-lg gap-1"
          style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}
        >
          {MODULES.map(m => (
            <button
              key={m}
              onClick={() => setModule(m)}
              className="px-3 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap"
              style={{
                background: selectedModule === m ? 'var(--bg-surface)' : 'transparent',
                color: selectedModule === m ? 'var(--text-heading)' : 'var(--text-muted)',
                border: selectedModule === m ? '1px solid var(--border)' : '1px solid transparent',
                boxShadow: selectedModule === m ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {m === 'ALL' ? 'All' : m.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Articles */}
      {articles.length === 0 && !isSearching && (
        <EmptyState
          icon={BookOpen}
          title={searchQuery ? 'No Matching Articles' : 'No Articles Yet'}
          description={searchQuery ? `No RAG results for "${searchQuery}".` : 'Add an article above to populate the knowledge base.'}
          compact
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {articles.map((item, i) => {
          const art = item.article;
          return (
            <div key={i} className="surface surface-interactive p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="badge-module" style={{ fontSize: '10px' }}>{art.erp_module}</span>
                    {art.error_code && (
                      <code className="text-[11px] font-mono text-muted-color">{art.error_code}</code>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-heading leading-snug">{art.title}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.ai_generated !== undefined && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${item.ai_generated ? 'badge-green' : 'badge-p3'}`}>
                      {item.ai_generated ? 'AI' : 'TF-IDF'}
                    </span>
                  )}
                  {item.confidence_percentage != null && (
                    <span
                      className="text-[11px] font-mono font-bold px-2 py-0.5 rounded"
                      style={{ background: 'var(--accent-subtle-bg)', color: 'var(--accent-subtle-text)', border: '1px solid var(--accent-subtle-bd)' }}
                    >
                      {item.confidence_percentage}%
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-body-color leading-relaxed surface-muted p-3 rounded-lg">{art.solution}</p>

              {item.why_relevant && (
                <p className="text-xs italic text-muted-color">"{item.why_relevant}"</p>
              )}

              {art.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {art.tags.map((t, ti) => (
                    <span key={ti} className="tag">#{t}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
