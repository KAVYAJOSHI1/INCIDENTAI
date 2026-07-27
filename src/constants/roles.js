// Mirrors server/constants.js ROLES/STAFF_ROLES — kept in sync manually since the
// frontend and backend don't share a module.
export const ROLES = ['END_USER', 'SUPPORT_TRIAGE', 'DEVELOPER', 'EXECUTIVE'];

export const ROLE_LABELS = {
  END_USER: 'End User',
  SUPPORT_TRIAGE: 'Support Triage',
  DEVELOPER: 'Developer',
  EXECUTIVE: 'Executive'
};

const ALL_VIEWS = ['REPORTER', 'TRIAGE', 'DEVELOPER', 'ADMIN', 'PIPELINE', 'WARROOM', 'DIGITALTWIN', 'MISSIONCONTROL'];

// END_USER accounts can only submit incidents — every other view is internal-staff
// tooling (triage, dev workbench, analytics, ops dashboards), gated to the other
// three roles which can all see the full nav (mirrors STAFF_ROLES on the backend).
export const VIEWS_BY_ROLE = {
  END_USER: ['REPORTER'],
  SUPPORT_TRIAGE: ALL_VIEWS,
  DEVELOPER: ALL_VIEWS,
  EXECUTIVE: ALL_VIEWS
};
