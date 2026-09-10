import { BACKEND_API_PATHS, fetchBackendApi } from "@/utils/api";
import type {
  ApprovalCase,
  ApprovalCaseDetail,
  ApprovalLookupOptions,
  ApprovalReport,
  ApprovalSummary,
  ApprovalWorkflow,
  ApprovalWorkflowStep,
} from "@/types/reportApproval";

type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: { message?: string } | null;
};

async function parseResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const body = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!response.ok || !body?.success || body.data === null) {
    throw new Error(body?.error?.message || fallbackMessage);
  }
  return body.data;
}

function approvalPath(path = "") {
  return `${BACKEND_API_PATHS.reportApproval}${path}`;
}

function workflowStepsPayload(steps: ApprovalWorkflowStep[]) {
  return steps.map((step) => ({
    name: step.name,
    approvalMode: step.approvalMode,
    rejectPolicy: step.rejectPolicy,
    canvasX: step.canvasX ?? 0,
    canvasY: step.canvasY ?? 0,
    targets: step.targets.map((target) => ({
      targetType: target.targetType,
      targetId: target.targetId,
      secondaryTargetId: target.secondaryTargetId ?? null,
      targetLabel: target.targetLabel,
      includeDescendants: target.includeDescendants,
    })),
  }));
}

export function fetchApprovalSummary() {
  return fetchBackendApi(approvalPath("/summary"), { cache: "no-store" }).then((response) =>
    parseResponse<ApprovalSummary>(response, "審核摘要載入失敗"),
  );
}

export function fetchApprovalInbox() {
  return fetchBackendApi(approvalPath("/inbox"), { cache: "no-store" }).then((response) =>
    parseResponse<ApprovalCase[]>(response, "待審案件載入失敗"),
  );
}

export function fetchMyApprovalSubmissions() {
  return fetchBackendApi(approvalPath("/submissions"), { cache: "no-store" }).then((response) =>
    parseResponse<ApprovalCase[]>(response, "我的送審載入失敗"),
  );
}

export function fetchAllApprovalCases() {
  return fetchBackendApi(approvalPath("/cases"), { cache: "no-store" }).then((response) =>
    parseResponse<ApprovalCase[]>(response, "全部案件載入失敗"),
  );
}

export function fetchApprovalCase(caseId: string) {
  return fetchBackendApi(approvalPath(`/cases/${caseId}`), { cache: "no-store" }).then((response) =>
    parseResponse<ApprovalCaseDetail>(response, "審核案件載入失敗"),
  );
}

export function fetchAvailableApprovalReports() {
  return fetchBackendApi(approvalPath("/reports/available"), { cache: "no-store" }).then((response) =>
    parseResponse<ApprovalReport[]>(response, "可送審報告載入失敗"),
  );
}

export function fetchPublishedApprovalWorkflows() {
  return fetchBackendApi(approvalPath("/workflows/published"), { cache: "no-store" }).then((response) =>
    parseResponse<ApprovalWorkflow[]>(response, "審核流程載入失敗"),
  );
}

export function submitReportForApproval(reportId: string, workflowId: string) {
  return fetchBackendApi(approvalPath(`/reports/${reportId}/submit`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workflowId }),
  }).then((response) => parseResponse<ApprovalCaseDetail>(response, "報告送審失敗"));
}

export function approveApprovalTask(taskId: string, comment: string) {
  return fetchBackendApi(approvalPath(`/tasks/${taskId}/approve`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment }),
  }).then((response) => parseResponse<ApprovalCaseDetail>(response, "審核通過失敗"));
}

export function rejectApprovalTask(taskId: string, comment: string) {
  return fetchBackendApi(approvalPath(`/tasks/${taskId}/reject`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment }),
  }).then((response) => parseResponse<ApprovalCaseDetail>(response, "審核拒絕失敗"));
}

export function withdrawApprovalCase(caseId: string, comment: string) {
  return fetchBackendApi(approvalPath(`/cases/${caseId}/withdraw`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment }),
  }).then((response) => parseResponse<ApprovalCaseDetail>(response, "撤回送審失敗"));
}

export async function downloadApprovalArtifact(caseId: string, fallbackFilename: string) {
  const response = await fetchBackendApi(approvalPath(`/cases/${caseId}/artifact`));
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiResponse<unknown> | null;
    throw new Error(body?.error?.message || "報告下載失敗");
  }
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/)?.[1];
  return {
    blob,
    filename: encoded ? decodeURIComponent(encoded) : fallbackFilename,
  };
}

export function fetchApprovalWorkflows() {
  return fetchBackendApi(approvalPath("/workflows"), { cache: "no-store" }).then((response) =>
    parseResponse<ApprovalWorkflow[]>(response, "流程設定載入失敗"),
  );
}

export function fetchApprovalWorkflow(workflowId: string) {
  return fetchBackendApi(approvalPath(`/workflows/${workflowId}`), { cache: "no-store" }).then((response) =>
    parseResponse<ApprovalWorkflow>(response, "流程內容載入失敗"),
  );
}

export function fetchApprovalLookupOptions() {
  return fetchBackendApi(approvalPath("/workflows/options"), { cache: "no-store" }).then((response) =>
    parseResponse<ApprovalLookupOptions>(response, "會員選項載入失敗"),
  );
}

export function createApprovalWorkflow(payload: {
  code: string;
  name: string;
  description: string;
  steps: ApprovalWorkflowStep[];
}) {
  return fetchBackendApi(approvalPath("/workflows"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, steps: workflowStepsPayload(payload.steps) }),
  }).then((response) => parseResponse<ApprovalWorkflow>(response, "建立流程失敗"));
}

export function updateApprovalWorkflow(
  workflowId: string,
  payload: { name: string; description: string; steps: ApprovalWorkflowStep[] },
) {
  return fetchBackendApi(approvalPath(`/workflows/${workflowId}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, steps: workflowStepsPayload(payload.steps) }),
  }).then((response) => parseResponse<ApprovalWorkflow>(response, "更新流程失敗"));
}

export function publishApprovalWorkflow(workflowId: string) {
  return fetchBackendApi(approvalPath(`/workflows/${workflowId}/publish`), {
    method: "POST",
  }).then((response) => parseResponse<ApprovalWorkflow>(response, "發布流程失敗"));
}

export function disableApprovalWorkflow(workflowId: string) {
  return fetchBackendApi(approvalPath(`/workflows/${workflowId}/disable`), {
    method: "POST",
  }).then((response) => parseResponse<ApprovalWorkflow>(response, "停用流程失敗"));
}
