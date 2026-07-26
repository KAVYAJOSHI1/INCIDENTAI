import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title, description, className = '', compact = false }) {
  return (
    <div className={`glass-panel text-center space-y-2 ${compact ? 'p-6' : 'p-12'} ${className}`}>
      <Icon className={`${compact ? 'w-8 h-8' : 'w-12 h-12'} text-indigo-400/60 mx-auto`} />
      <h3 className={`font-bold text-white ${compact ? 'text-sm' : 'text-lg'}`}>{title}</h3>
      {description && <p className="text-xs text-slate-400 max-w-sm mx-auto">{description}</p>}
    </div>
  );
}
