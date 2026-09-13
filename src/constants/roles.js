// IncidentAI has exactly two authenticated personas. The real business user operates
// through the separate Smart Manufacturing ERP — IncidentAI is the intelligence and
// incident-management layer, not another end-user application.
export const ROLES = ['DEVELOPER', 'EXECUTIVE'];

export const ROLE_LABELS = {
  DEVELOPER: 'Developer',
  EXECUTIVE: 'Executive'
};

// Nav is trimmed to the incident-lifecycle demo path. War Room / Mission Control
// components and routes are kept (reachable by URL) but removed from the default nav
// to keep the live presentation focused. Re-add the ids here to surface them again.
export const VIEWS_BY_ROLE = {
  DEVELOPER: ['TRIAGE', 'DEVELOPER', 'PIPELINE', 'KNOWLEDGE', 'DIGITALTWIN', 'INTEGRATIONS'],
  EXECUTIVE: ['ADMIN', 'DIGITALTWIN', 'INTEGRATIONS']
};

export const DEFAULT_VIEW_BY_ROLE = {
  DEVELOPER: 'TRIAGE',
  EXECUTIVE: 'ADMIN'
};
