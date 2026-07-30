import React from 'react';

/**
 * Shared page-level header used by every view.
 * Eliminates copy-paste banner pattern across ExecutiveDashboard,
 * DeveloperLoadBalancer, KnowledgeHub, SmartReporter.
 */
export default function PageHeader({ badge, title, description, action, children }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div className="min-w-0">
        {badge && (
          <span className="badge-module mb-2 inline-block">{badge}</span>
        )}
        <h2 className="text-lg font-semibold text-heading leading-tight">{title}</h2>
        {description && (
          <p className="text-sm text-muted-color mt-0.5 max-w-2xl">{description}</p>
        )}
        {children}
      </div>
      {action && (
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          {action}
        </div>
      )}
    </div>
  );
}
