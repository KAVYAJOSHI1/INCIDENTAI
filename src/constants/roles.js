// IncidentAI has exactly two authenticated personas. The real business user operates
// through the separate Smart Manufacturing ERP — IncidentAI is the intelligence and
// incident-management layer, not another end-user application.
export const ROLES = ['DEVELOPER', 'EXECUTIVE'];

export const ROLE_LABELS = {
  DEVELOPER: 'Developer',
  EXECUTIVE: 'Executive'
};

export const VIEWS_BY_ROLE = {
  // Developer: investigate, approve, remediate, verify, rollback
  DEVELOPER: ['TRIAGE', 'DEVELOPER', 'PIPELINE', 'DIGITALTWIN', 'INTEGRATIONS'],
  // Executive: monitor incidents, business impact, SLA, risk, overall system status
  EXECUTIVE: ['ADMIN', 'WARROOM', 'MISSIONCONTROL', 'DIGITALTWIN', 'INTEGRATIONS']
};

export const DEFAULT_VIEW_BY_ROLE = {
  DEVELOPER: 'TRIAGE',
  EXECUTIVE: 'ADMIN'
};
