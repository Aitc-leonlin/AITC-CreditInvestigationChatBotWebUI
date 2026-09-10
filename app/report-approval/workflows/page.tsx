"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GitBranch,
  Layers3,
  Pencil,
  Plus,
  Save,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import MembershipSessionGuard from "@/components/membership/MembershipSessionGuard";
import { MembershipRouteGuard } from "@/components/membership/authorization";
import WorkflowFlowDesigner from "@/components/report-approval/WorkflowFlowDesigner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MODULE_PERMISSIONS } from "@/data/modulePermissions";
import {
  createApprovalWorkflow,
  disableApprovalWorkflow,
  fetchApprovalLookupOptions,
  fetchApprovalWorkflow,
  fetchApprovalWorkflows,
  publishApprovalWorkflow,
  updateApprovalWorkflow,
} from "@/services/api/reportApprovalApi";
import type {
  ApprovalLookupOptions,
  ApprovalWorkflow,
  ApprovalWorkflowStep,
} from "@/types/reportApproval";


const EMPTY_OPTIONS: ApprovalLookupOptions = {
  users: [],
  organizations: [],
  positions: [],
  groups: [],
  roles: [],
};

function emptyStep(order: number): ApprovalWorkflowStep {
  return {
    clientId: `draft-initial-${order}`,
    name: `第 ${order} 關審核`,
    approvalMode: "ANY_ONE",
    rejectPolicy: "RETURN_TO_SUBMITTER",
    targets: [{
      targetType: "USER",
      targetId: "",
      secondaryTargetId: null,
      targetLabel: "",
      includeDescendants: false,
    }],
    canvasX: 280 * order,
    canvasY: 120,
  };
}

function prepareStepsForEditor(source: ApprovalWorkflowStep[]) {
  const allAtOrigin = source.every((step) => Number(step.canvasX ?? 0) === 0 && Number(step.canvasY ?? 0) === 0);
  return source.map((step, index) => ({
    ...step,
    clientId: step.id || step.clientId || `draft-loaded-${index + 1}`,
    canvasX: allAtOrigin ? 280 * (index + 1) : Number(step.canvasX ?? 280 * (index + 1)),
    canvasY: 120,
  }));
}

function statusStyle(status: string) {
  if (status === "PUBLISHED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "DISABLED") return "border-slate-200 bg-slate-50 text-slate-500";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function ApprovalWorkflowPage() {
  return (
    <MembershipRouteGuard permission={MODULE_PERMISSIONS.reportApprovalWorkflowManage}>
      <MembershipSessionGuard>
        <ApprovalWorkflowContent />
      </MembershipSessionGuard>
    </MembershipRouteGuard>
  );
}

function ApprovalWorkflowContent() {
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [options, setOptions] = useState<ApprovalLookupOptions>(EMPTY_OPTIONS);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<ApprovalWorkflowStep[]>([emptyStep(1)]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const [workflowRows, lookupOptions] = await Promise.all([
        fetchApprovalWorkflows(),
        fetchApprovalLookupOptions(),
      ]);
      setWorkflows(workflowRows);
      setOptions(lookupOptions);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "流程設定載入失敗");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setCode("");
    setName("");
    setDescription("");
    setSteps([emptyStep(1)]);
    setEditorOpen(true);
  }

  async function openEdit(workflowId: string) {
    try {
      const workflow = await fetchApprovalWorkflow(workflowId);
      setEditingId(workflow.id);
      setCode(workflow.code);
      setName(workflow.name);
      setDescription(workflow.description);
      setSteps(prepareStepsForEditor(workflow.steps?.length ? workflow.steps : [emptyStep(1)]));
      setEditorOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "流程內容載入失敗");
    }
  }

  const isValid = useMemo(
    () =>
      Boolean(code.trim() && name.trim() && steps.length) &&
      steps.every((step) => step.name.trim() && step.targets.length && step.targets.every((target) => target.targetId && (target.targetType !== "ORGANIZATION_POSITION" || target.secondaryTargetId))),
    [code, name, steps],
  );

  async function saveWorkflow() {
    if (!isValid) {
      toast.error("請完成流程名稱、每一關及審核對象設定");
      return;
    }
    try {
      setIsSaving(true);
      if (editingId) {
        await updateApprovalWorkflow(editingId, { name, description, steps });
        toast.success("已建立新的流程草稿版本");
      } else {
        await createApprovalWorkflow({ code: code.trim().toUpperCase(), name, description, steps });
        toast.success("審核流程草稿已建立");
      }
      setEditorOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "流程儲存失敗");
    } finally {
      setIsSaving(false);
    }
  }

  async function publish(workflowId: string) {
    try {
      await publishApprovalWorkflow(workflowId);
      toast.success("流程已發布，可供正式送審使用");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "流程發布失敗");
    }
  }

  async function disable(workflowId: string) {
    try {
      await disableApprovalWorkflow(workflowId);
      toast.success("流程已停用");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "流程停用失敗");
    }
  }

  return (
    <main className="h-full overflow-y-auto bg-[#F6F8FA]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 md:px-6">
        <section className="rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-slate-50 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><div className="text-sm font-semibold tracking-[0.18em] text-violet-700">WORKFLOW DESIGNER</div><h1 className="mt-2 text-3xl font-black text-slate-900">審核流程設定</h1><p className="mt-2 text-sm text-slate-600">以會員、組織、職階、群組或角色設定逐關審核路線。</p></div>
            <Button onClick={openCreate} className="bg-violet-600 text-white hover:bg-violet-700"><Plus className="h-4 w-4" />新增流程</Button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {isLoading ? <div className="col-span-full py-12 text-center text-slate-500">載入中...</div> : null}
            {!isLoading && workflows.length === 0 ? <div className="col-span-full py-12 text-center text-slate-500">尚未建立審核流程</div> : null}
            {!isLoading && workflows.map((workflow) => (
              <article key={workflow.id} className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><GitBranch className="h-5 w-5" /></span><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyle(workflow.status)}`}>{workflow.status}</span></div>
                <h2 className="mt-4 text-lg font-bold text-slate-900">{workflow.name}</h2>
                <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{workflow.code}｜v{workflow.versionNumber}</div>
                <p className="mt-3 min-h-10 text-sm leading-5 text-slate-600">{workflow.description || "尚未填寫說明"}</p>
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Layers3 className="h-4 w-4" />{workflow.stepCount} 個審核關卡</div>
                <div className="mt-5 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => openEdit(workflow.id)}><Pencil className="h-4 w-4" />建立新版</Button>{workflow.status !== "PUBLISHED" ? <Button size="sm" onClick={() => publish(workflow.id)} className="bg-emerald-600 text-white hover:bg-emerald-700"><Send className="h-4 w-4" />發布</Button> : <Button variant="outline" size="sm" onClick={() => disable(workflow.id)} className="text-rose-700">停用</Button>}</div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[96vh] max-w-[min(98vw,1560px)] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "建立流程新版" : "新增審核流程"}</DialogTitle><DialogDescription>流程儲存後為草稿；發布後才可被送審人選用。既有審核案件不受新版影響。</DialogDescription></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2"><label className="space-y-1.5 text-sm font-medium text-slate-700">流程代碼<Input value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9._-]/g, ""))} disabled={Boolean(editingId)} placeholder="STANDARD_CREDIT_REVIEW" /></label><label className="space-y-1.5 text-sm font-medium text-slate-700">流程名稱<Input value={name} onChange={(event) => setName(event.target.value)} placeholder="一般徵審報告核准流程" /></label></div>
          <label className="space-y-1.5 text-sm font-medium text-slate-700">流程說明<Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="說明此流程適用的報告與核決範圍" /></label>
          <WorkflowFlowDesigner steps={steps} options={options} onChange={setSteps} />
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4"><Button variant="outline" onClick={() => setEditorOpen(false)}>取消</Button><Button onClick={saveWorkflow} disabled={isSaving || !isValid} className="bg-violet-600 text-white hover:bg-violet-700"><Save className="h-4 w-4" />{isSaving ? "儲存中..." : "儲存草稿"}</Button></div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
