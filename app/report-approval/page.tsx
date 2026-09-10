"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileCheck2,
  FileClock,
  RotateCcw,
  ShieldX,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import MembershipSessionGuard from "@/components/membership/MembershipSessionGuard";
import { MembershipAnyPermissionRouteGuard } from "@/components/membership/authorization";
import ApprovalFlowDiagram from "@/components/report-approval/ApprovalFlowDiagram";
import { MODULE_PERMISSIONS } from "@/data/modulePermissions";
import { useMembershipPermissions } from "@/hooks/useMembershipPermissions";
import { getStoredAuthUser } from "@/services/api/membershipAuthApi";
import {
  approveApprovalTask,
  downloadApprovalArtifact,
  fetchAllApprovalCases,
  fetchApprovalCase,
  fetchApprovalInbox,
  fetchApprovalSummary,
  fetchMyApprovalSubmissions,
  rejectApprovalTask,
  withdrawApprovalCase,
} from "@/services/api/reportApprovalApi";
import type {
  ApprovalCase,
  ApprovalCaseDetail,
  ApprovalSummary,
} from "@/types/reportApproval";

const EMPTY_SUMMARY: ApprovalSummary = {
  pendingMyReview: 0,
  myInReview: 0,
  myApproved: 0,
  myRejected: 0,
};

const STATUS_LABELS: Record<string, string> = {
  IN_REVIEW: "審核中",
  APPROVED: "已通過",
  REJECTED: "已拒絕",
  WITHDRAWN: "已撤回",
  CANCELLED: "已取消",
  PENDING: "待審核",
  WAITING: "等待中",
  SKIPPED: "已略過",
};

const STATUS_STYLES: Record<string, string> = {
  IN_REVIEW: "border-amber-200 bg-amber-50 text-amber-700",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
  WITHDRAWN: "border-slate-200 bg-slate-50 text-slate-600",
  PENDING: "border-sky-200 bg-sky-50 text-sky-700",
  WAITING: "border-slate-200 bg-slate-50 text-slate-500",
  SKIPPED: "border-slate-200 bg-slate-50 text-slate-500",
};

type TabKey = "inbox" | "submissions" | "all";

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-TW");
}

function StatusChip({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status] ?? STATUS_STYLES.WAITING}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export default function ReportApprovalPage() {
  return (
    <MembershipAnyPermissionRouteGuard permissions={[
      MODULE_PERMISSIONS.reportApprovalView,
      MODULE_PERMISSIONS.reportApprovalSubmit,
      MODULE_PERMISSIONS.reportApprovalReview,
      MODULE_PERMISSIONS.reportApprovalViewAll,
      MODULE_PERMISSIONS.reportApprovalWorkflowManage,
      MODULE_PERMISSIONS.reportApprovalReassign,
    ]}>
      <MembershipSessionGuard>
        <ReportApprovalContent />
      </MembershipSessionGuard>
    </MembershipAnyPermissionRouteGuard>
  );
}

function ReportApprovalContent() {
  const { hasPermission, isLoading: permissionsLoading } = useMembershipPermissions();
  const canReview = hasPermission(MODULE_PERMISSIONS.reportApprovalReview);
  const canSubmit = hasPermission(MODULE_PERMISSIONS.reportApprovalSubmit);
  const canViewAll = hasPermission(MODULE_PERMISSIONS.reportApprovalViewAll);
  const currentUserId = getStoredAuthUser()?.id ?? "";
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [tab, setTab] = useState<TabKey>("inbox");
  const [cases, setCases] = useState<ApprovalCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<ApprovalCaseDetail | null>(null);
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isActing, setIsActing] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await fetchApprovalSummary());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "審核摘要載入失敗");
    }
  }, []);

  const loadCases = useCallback(async () => {
    if (permissionsLoading) return;
    setIsLoading(true);
    try {
      if (tab === "inbox") {
        setCases(canReview ? await fetchApprovalInbox() : []);
      } else if (tab === "submissions") {
        setCases(canSubmit ? await fetchMyApprovalSubmissions() : []);
      } else {
        setCases(canViewAll ? await fetchAllApprovalCases() : []);
      }
    } catch (error) {
      setCases([]);
      toast.error(error instanceof Error ? error.message : "審核案件載入失敗");
    } finally {
      setIsLoading(false);
    }
  }, [canReview, canSubmit, canViewAll, permissionsLoading, tab]);

  useEffect(() => {
    if (permissionsLoading) return;
    if (!canReview && canSubmit) setTab("submissions");
    else if (!canReview && !canSubmit && canViewAll) setTab("all");
    void loadSummary();
  }, [canReview, canSubmit, canViewAll, loadSummary, permissionsLoading]);

  useEffect(() => {
    void loadCases();
  }, [loadCases]);

  async function openCase(caseId: string) {
    try {
      setSelectedCase(await fetchApprovalCase(caseId));
      setComment("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "案件載入失敗");
    }
  }

  const pendingTask = useMemo(
    () =>
      selectedCase?.steps
        .flatMap((step) => step.tasks)
        .find((task) => task.approverUserId === currentUserId && task.status === "PENDING"),
    [currentUserId, selectedCase],
  );

  async function handleDecision(decision: "approve" | "reject") {
    if (!pendingTask) return;
    if (decision === "reject" && !comment.trim()) {
      toast.error("拒絕時必須填寫原因");
      return;
    }
    try {
      setIsActing(true);
      const updated = decision === "approve"
        ? await approveApprovalTask(pendingTask.id, comment)
        : await rejectApprovalTask(pendingTask.id, comment);
      setSelectedCase(updated);
      setComment("");
      toast.success(decision === "approve" ? "本關審核已通過" : "報告已拒絕並退回");
      await Promise.all([loadSummary(), loadCases()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "審核操作失敗");
    } finally {
      setIsActing(false);
    }
  }

  async function handleWithdraw() {
    if (!selectedCase) return;
    try {
      setIsActing(true);
      const updated = await withdrawApprovalCase(selectedCase.id, comment);
      setSelectedCase(updated);
      setComment("");
      toast.success("送審案件已撤回");
      await Promise.all([loadSummary(), loadCases()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "撤回失敗");
    } finally {
      setIsActing(false);
    }
  }

  async function handleDownload() {
    if (!selectedCase) return;
    try {
      const result = await downloadApprovalArtifact(selectedCase.id, selectedCase.fileName);
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "報告下載失敗");
    }
  }

  const statCards = [
    { label: "待我審核", value: summary.pendingMyReview, Icon: FileClock, color: "text-sky-700 bg-sky-50" },
    { label: "我的審核中", value: summary.myInReview, Icon: Clock3, color: "text-amber-700 bg-amber-50" },
    { label: "我的已通過", value: summary.myApproved, Icon: CheckCircle2, color: "text-emerald-700 bg-emerald-50" },
    { label: "我的已拒絕", value: summary.myRejected, Icon: ShieldX, color: "text-rose-700 bg-rose-50" },
  ];

  return (
    <main className="h-full overflow-y-auto bg-[#F6F8FA]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 md:px-6">
        <section className="rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-slate-50 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold tracking-[0.18em] text-violet-700">REPORT APPROVAL</div>
              <h1 className="mt-2 text-3xl font-black text-slate-900">報告審核中心</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">送出正式報告、處理審核任務，並追蹤每一關的決策紀錄。</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map(({ label, value, Icon, color }) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}><Icon className="h-5 w-5" /></div>
                <div className="mt-3 text-2xl font-black text-slate-900">{value}</div>
                <div className="text-sm text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap gap-2 border-b border-slate-200 p-4">
            {canReview ? <Button variant={tab === "inbox" ? "default" : "outline"} onClick={() => setTab("inbox")} className={tab === "inbox" ? "bg-violet-600 text-white hover:bg-violet-700" : ""}>待我審核</Button> : null}
            {canSubmit ? <Button variant={tab === "submissions" ? "default" : "outline"} onClick={() => setTab("submissions")} className={tab === "submissions" ? "bg-violet-600 text-white hover:bg-violet-700" : ""}>我的送審</Button> : null}
            {canViewAll ? <Button variant={tab === "all" ? "default" : "outline"} onClick={() => setTab("all")} className={tab === "all" ? "bg-violet-600 text-white hover:bg-violet-700" : ""}>全部案件</Button> : null}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">報告</th><th className="px-5 py-3">送審人</th><th className="px-5 py-3">流程／關卡</th><th className="px-5 py-3">狀態</th><th className="px-5 py-3">送審時間</th><th className="px-5 py-3 text-right">操作</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {!isLoading && cases.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">目前沒有案件</td></tr> : null}
                {isLoading ? <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">載入中...</td></tr> : null}
                {!isLoading && cases.map((item) => (
                  <tr key={`${item.id}-${item.taskId ?? "case"}`} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4"><div className="font-semibold text-slate-900">{item.fileName || item.title}</div><div className="mt-1 text-xs text-slate-500">{item.company}｜{item.year} {item.period}</div></td>
                    <td className="px-5 py-4 text-slate-600">{item.submitterDisplayName}</td>
                    <td className="px-5 py-4"><div className="font-medium text-slate-700">{item.workflowName} v{item.workflowVersion}</div><div className="mt-1 text-xs text-slate-500">{item.currentStepName || "流程已結束"}</div></td>
                    <td className="px-5 py-4"><StatusChip status={item.status} /></td>
                    <td className="px-5 py-4 text-slate-500">{formatDateTime(item.submittedAt)}</td>
                    <td className="px-5 py-4 text-right"><Button variant="outline" size="sm" onClick={() => openCase(item.id)}><Eye className="h-4 w-4" />查看</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <Dialog open={Boolean(selectedCase)} onOpenChange={(open) => { if (!open) setSelectedCase(null); }}>
        <DialogContent className="max-h-[92vh] max-w-[min(96vw,1280px)] overflow-y-auto">
          {selectedCase ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-3 text-xl"><FileCheck2 className="h-5 w-5 text-violet-600" />{selectedCase.fileName}<StatusChip status={selectedCase.status} /></DialogTitle>
                <DialogDescription>{selectedCase.company}｜{selectedCase.year} {selectedCase.period}｜送審人：{selectedCase.submitterDisplayName}</DialogDescription>
              </DialogHeader>
              <ApprovalFlowDiagram approvalCase={selectedCase} />
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-4">
                  <section className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-semibold text-slate-900">審核人員明細</div><div className="text-sm text-slate-500">{selectedCase.workflowName} v{selectedCase.workflowVersion}</div></div><Button variant="outline" size="sm" onClick={handleDownload}><Download className="h-4 w-4" />下載審核版本</Button></div>
                    <div className="mt-4 space-y-3">
                      {selectedCase.steps.map((step) => (
                        <div key={step.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-center justify-between gap-3"><div className="font-semibold text-slate-800">第 {step.stepOrder} 關｜{step.name}</div><StatusChip status={step.status} /></div>
                          <div className="mt-2 space-y-1 text-sm text-slate-600">{step.tasks.map((task) => <div key={task.id} className="flex items-center justify-between gap-3"><span>{task.approverDisplayName}</span><span>{STATUS_LABELS[task.status] ?? task.status}{task.comment ? `｜${task.comment}` : ""}</span></div>)}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section className="rounded-xl border border-slate-200 p-4"><div className="font-semibold text-slate-900">審核歷程</div><div className="mt-3 space-y-3">{selectedCase.actions.map((action) => <div key={action.id} className="border-l-2 border-violet-200 pl-3 text-sm"><div className="font-medium text-slate-800">{action.actorDisplayName}｜{STATUS_LABELS[action.action] ?? action.action}</div><div className="text-xs text-slate-500">{formatDateTime(action.createdAt)}</div>{action.comment ? <div className="mt-1 text-slate-600">{action.comment}</div> : null}</div>)}</div></section>
                </div>
                <aside className="space-y-4">
                  <section className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="text-sm font-semibold text-slate-900">文件驗證</div><div className="mt-2 break-all font-mono text-[11px] leading-5 text-slate-500">SHA-256<br />{selectedCase.artifactSha256}</div></section>
                  {pendingTask || (selectedCase.submitterUserId === currentUserId && selectedCase.status === "IN_REVIEW") ? (
                    <section className="rounded-xl border border-violet-200 bg-violet-50/60 p-4"><label className="text-sm font-semibold text-slate-900">審核／撤回意見</label><Textarea value={comment} onChange={(event) => setComment(event.target.value)} className="mt-2 min-h-28 bg-white" placeholder="通過意見可不填；拒絕原因必填" />{pendingTask ? <div className="mt-3 grid grid-cols-2 gap-2"><Button onClick={() => handleDecision("approve")} disabled={isActing} className="bg-emerald-600 text-white hover:bg-emerald-700"><CheckCircle2 className="h-4 w-4" />通過</Button><Button onClick={() => handleDecision("reject")} disabled={isActing} variant="destructive"><XCircle className="h-4 w-4" />拒絕</Button></div> : <Button onClick={handleWithdraw} disabled={isActing} variant="outline" className="mt-3 w-full text-rose-700"><RotateCcw className="h-4 w-4" />撤回送審</Button>}</section>
                  ) : null}
                </aside>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}
