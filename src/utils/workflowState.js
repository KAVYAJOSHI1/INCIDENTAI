/**
 * Frontend mirror of the authoritative backend incident workflow state machine
 * (server/services/workflowStateMachine.js).
 *
 * The frontend NEVER invents its own progression — it derives the current stage
 * purely from `ticket.status` / `ticket.remediation_status` / `ticket.verification_result`
 * that the backend returned, and asks "which single action is valid next?".
 *
 * AI-diagnosis availability and workflow position are deliberately separate:
 * `isAiDiagnosisAvailable()` says whether evidence exists; the lifecycle stage is
 * decided only by the persisted status.
 */

// The 8 canonical lifecycle stages shown in the Incident Resolution Lifecycle visual.
export const LIFECYCLE_STEP_KEYS = [
  'ERP_SOURCE',
  'INCIDENT_CREATED',
  'TRIAGE_ASSIGN',
  'AI_DIAGNOSIS',
  'REMEDIATION_PLAN',
  'HUMAN_APPROVAL',
  'VERIFICATION',
  'RESOLVED'
];

const RESOLVED_STATUSES = ['RESOLVED', 'VERIFIED', 'KNOWLEDGE_CAPTURED', 'APPLIED', 'SELF_SERVICE_RESOLVED', 'RESOLVED_DUPLICATE_MERGED', 'CLOSED'];

/**
 * @returns {{
 *   stateKey: string, label: string, description: string,
 *   nextActionKey: string|null, nextActionCTA: string|null, nextActionTab: string|null,
 *   isFailurePath: boolean, confidencePercent: string
 * }}
 */
export function normalizeIncidentWorkflowState(ticket, _remediation = null, verificationResult = null) {
  const status = String(ticket?.status || 'NEW').toUpperCase();
  const remStatus = String(ticket?.remediation_status || '').toUpperCase();
  const verif = verificationResult || ticket?.verification_result || null;
  const verifPassed = verif?.status === 'PASS';

  const confidence = ticket?.ai_confidence;
  const confidencePercent = confidence != null ? `${Math.round(confidence * 100)}%` : 'Confidence unavailable';

  // 1. Fully resolved
  if (RESOLVED_STATUSES.includes(status) || remStatus === 'APPLIED') {
    return {
      stateKey: 'RESOLVED',
      label: 'RESOLVED',
      description: 'Patch applied to the target environment. Incident is fully resolved and the resolution has been written back to the RAG knowledge base.',
      nextActionKey: null,
      nextActionCTA: null,
      nextActionTab: 'TIMELINE',
      isFailurePath: false,
      confidencePercent
    };
  }

  // 2. Rolled back — failure loop, awaiting return to remediation
  if (status === 'ROLLED_BACK' || remStatus === 'ROLLED_BACK') {
    return {
      stateKey: 'ROLLED_BACK',
      label: 'ROLLED BACK',
      description: 'The patch was safely reverted to the previous stable version. The incident is held for the developer to revise the remediation plan.',
      nextActionKey: 'RETURN_TO_REMEDIATION',
      nextActionCTA: 'Return to Remediation',
      nextActionTab: 'REMEDIATION',
      isFailurePath: true,
      confidencePercent
    };
  }

  // 3. Verification failed
  if (status === 'VERIFICATION_FAILED' || status === 'ROLLBACK_REQUIRED' || remStatus === 'VERIFICATION_FAILED' || verif?.status === 'FAIL') {
    return {
      stateKey: 'VERIFICATION_FAILED',
      label: 'VERIFICATION FAILED',
      description: 'The automated post-patch verification suite failed. Review the failed checks and initiate a controlled rollback.',
      nextActionKey: 'ROLLBACK',
      nextActionCTA: 'Initiate Controlled Rollback',
      nextActionTab: 'VERIFICATION',
      isFailurePath: true,
      confidencePercent
    };
  }

  // 4. Verification passed — ready to apply
  if ((status === 'VERIFICATION' && verifPassed) || (status === 'VERIFICATION' && !verif) || remStatus === 'VERIFIED') {
    return {
      stateKey: 'VERIFIED_READY',
      label: 'VERIFICATION PASSED',
      description: 'All automated verification checks passed. Ready for the developer to apply the verified patch and resolve the incident.',
      nextActionKey: 'APPLY_PATCH',
      nextActionCTA: 'Apply Patch & Resolve Incident',
      nextActionTab: 'VERIFICATION',
      isFailurePath: false,
      confidencePercent
    };
  }

  // 5. Approved — ready to verify
  if (status === 'APPROVED' || remStatus === 'APPROVED') {
    return {
      stateKey: 'APPROVED',
      label: 'APPROVED',
      description: 'Remediation plan approved by the developer. Run the automated post-patch verification suite before deployment.',
      nextActionKey: 'START_VERIFICATION',
      nextActionCTA: 'Start Automated Verification',
      nextActionTab: 'VERIFICATION',
      isFailurePath: false,
      confidencePercent
    };
  }

  // 6. In progress — developer owns it, remediation plan awaiting approval
  if (status === 'IN_PROGRESS' || status === 'ASSIGNED') {
    return {
      stateKey: 'IN_PROGRESS',
      label: 'IN PROGRESS',
      description: 'Incident is assigned to a developer. Review the AI-proposed remediation plan and approve or reject it.',
      nextActionKey: 'APPROVE_REMEDIATION',
      nextActionCTA: 'Review & Approve Remediation Plan',
      nextActionTab: 'REMEDIATION',
      isFailurePath: false,
      confidencePercent
    };
  }

  // 7. Triaged (default) — AI diagnosis available for review
  return {
    stateKey: 'TRIAGED',
    label: 'TRIAGED',
    description: 'Incident ingested from ERP and triaged. The AI root-cause diagnosis and evidence chain are available for developer review.',
    nextActionKey: 'APPROVE_REMEDIATION',
    nextActionCTA: 'Review Diagnosis & Approve Remediation Plan',
    nextActionTab: 'REMEDIATION',
    isFailurePath: false,
    confidencePercent
  };
}

export function isAiDiagnosisAvailable(ticket) {
  if (!ticket) return false;
  return Boolean(
    (ticket.ai_diagnosis && Object.keys(ticket.ai_diagnosis).length > 0) ||
    ticket.ai_root_cause ||
    ticket.ai_suggested_patch
  );
}

/**
 * Per-step status for the lifecycle visual.
 * @returns {'COMPLETED'|'ACTIVE'|'PENDING'|'FAILED'}
 */
export function getStepStatus(stepKey, normalizedState, ticket = null) {
  const s = normalizedState.stateKey;
  const isAssigned = Boolean(ticket?.assigned_dev_name || ticket?.assigned_dev_id);

  switch (stepKey) {
    case 'ERP_SOURCE':
    case 'INCIDENT_CREATED':
      return 'COMPLETED';

    case 'TRIAGE_ASSIGN':
      if (s === 'TRIAGED' && !isAssigned) return 'ACTIVE';
      return 'COMPLETED';

    case 'AI_DIAGNOSIS':
      if (s === 'TRIAGED') return 'ACTIVE';
      return 'COMPLETED';

    case 'REMEDIATION_PLAN':
      if (s === 'TRIAGED') return 'PENDING';
      if (s === 'IN_PROGRESS' || s === 'ROLLED_BACK') return 'ACTIVE';
      return 'COMPLETED';

    case 'HUMAN_APPROVAL':
      if (s === 'TRIAGED') return 'PENDING';
      if (s === 'IN_PROGRESS') return 'ACTIVE';
      if (s === 'ROLLED_BACK') return 'PENDING';
      return 'COMPLETED';

    case 'VERIFICATION':
      if (s === 'VERIFICATION_FAILED') return 'FAILED';
      if (s === 'APPROVED') return 'ACTIVE';
      if (s === 'VERIFIED_READY' || s === 'RESOLVED') return 'COMPLETED';
      return 'PENDING';

    case 'RESOLVED':
      if (s === 'RESOLVED') return 'COMPLETED';
      if (s === 'VERIFIED_READY') return 'ACTIVE';
      return 'PENDING';

    default:
      return 'PENDING';
  }
}
