export type ApprovalStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "WITHDRAWN"
  | "CANCELLED";

export type ApprovalTargetType =
  | "USER"
  | "ORGANIZATION"
  | "POSITION"
  | "ORGANIZATION_POSITION"
  | "GROUP"
  | "ROLE";

export type ApprovalTarget = {
  id?: string;
  targetType: ApprovalTargetType;
  targetId: string;
  secondaryTargetId?: string | null;
  targetLabel: string;
  includeDescendants: boolean;
};

export type ApprovalWorkflowStep = {
  id?: string;
  clientId?: string;
  stepOrder?: number;
  name: string;
  approvalMode: "ANY_ONE" | "ALL";
  rejectPolicy: "RETURN_TO_SUBMITTER";
  targets: ApprovalTarget[];
  canvasX?: number;
  canvasY?: number;
};

export type ApprovalWorkflow = {
  id: string;
  code: string;
  name: string;
  description: string;
  status: "DRAFT" | "PUBLISHED" | "DISABLED";
  versionNumber: number;
  versionId?: string;
  versionStatus?: string;
  publishedAt?: string | null;
  stepCount: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  steps?: ApprovalWorkflowStep[];
};

export type ApprovalCase = {
  id: string;
  taskId?: string | null;
  reportId: string;
  title: string;
  company: string;
  year: string;
  period: string;
  reportType: string;
  fileName: string;
  workflowId: string;
  workflowName: string;
  workflowVersion: number;
  submitterUserId: string;
  submitterDisplayName: string;
  status: ApprovalStatus;
  currentStepOrder?: number | null;
  currentStepName?: string | null;
  rejectionReason: string;
  submittedAt: string;
  completedAt?: string | null;
};

export type ApprovalTask = {
  id: string;
  approverUserId: string;
  approverDisplayName: string;
  status: string;
  comment: string;
  actedAt?: string | null;
};

export type ApprovalStepInstance = {
  id: string;
  stepOrder: number;
  name: string;
  approvalMode: "ANY_ONE" | "ALL";
  rejectPolicy: string;
  status: string;
  startedAt?: string | null;
  completedAt?: string | null;
  tasks: ApprovalTask[];
};

export type ApprovalAction = {
  id: string;
  actorUserId: string;
  actorDisplayName: string;
  action: string;
  comment: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ApprovalCaseDetail = ApprovalCase & {
  artifactVersion: number;
  artifactSha256: string;
  generatedAt: string;
  steps: ApprovalStepInstance[];
  actions: ApprovalAction[];
};

export type ApprovalReport = {
  id: string;
  publicId: string;
  title: string;
  company: string;
  year: string;
  period: string;
  reportType: string;
  generatedAt: string;
  generatedBy: string;
  status: string;
  fileName: string;
  artifactId: string;
  artifactVersion: number;
  artifactSha256: string;
};

export type ApprovalLookupOption = {
  id: string;
  label: string;
  code?: string;
  path?: string;
  level?: number;
};

export type ApprovalLookupOptions = {
  users: ApprovalLookupOption[];
  organizations: ApprovalLookupOption[];
  positions: ApprovalLookupOption[];
  groups: ApprovalLookupOption[];
  roles: ApprovalLookupOption[];
};

export type ApprovalSummary = {
  pendingMyReview: number;
  myInReview: number;
  myApproved: number;
  myRejected: number;
};
