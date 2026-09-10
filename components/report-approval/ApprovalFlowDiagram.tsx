"use client";

import { memo, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import {
  Check,
  Circle,
  Clock3,
  FileUp,
  Flag,
  ShieldX,
  Users,
} from "lucide-react";

import type { ApprovalCaseDetail, ApprovalStepInstance } from "@/types/reportApproval";

type FlowNodeKind = "start" | "step" | "end";

type ApprovalFlowNodeData = {
  kind: FlowNodeKind;
  eyebrow: string;
  title: string;
  status: string;
  statusLabel: string;
  meta: string;
  people?: string;
};

type ApprovalFlowNode = Node<ApprovalFlowNodeData, "approvalStage">;

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "已送審",
  IN_REVIEW: "審核中",
  PENDING: "目前關卡",
  WAITING: "尚未開始",
  APPROVED: "已通過",
  REJECTED: "已拒絕",
  WITHDRAWN: "已撤回",
  CANCELLED: "已取消",
  SKIPPED: "已略過",
};

const STATUS_COLORS: Record<string, { border: string; badge: string; dot: string }> = {
  SUBMITTED: {
    border: "border-sky-300 bg-sky-50",
    badge: "bg-sky-100 text-sky-700",
    dot: "bg-sky-500",
  },
  PENDING: {
    border: "border-violet-400 bg-violet-50 shadow-[0_12px_30px_rgba(124,58,237,0.16)]",
    badge: "bg-violet-600 text-white",
    dot: "bg-violet-500",
  },
  IN_REVIEW: {
    border: "border-violet-300 bg-violet-50",
    badge: "bg-violet-100 text-violet-700",
    dot: "bg-violet-500",
  },
  APPROVED: {
    border: "border-emerald-300 bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  REJECTED: {
    border: "border-rose-300 bg-rose-50",
    badge: "bg-rose-100 text-rose-700",
    dot: "bg-rose-500",
  },
  WITHDRAWN: {
    border: "border-slate-300 bg-slate-50",
    badge: "bg-slate-200 text-slate-600",
    dot: "bg-slate-400",
  },
  CANCELLED: {
    border: "border-slate-300 bg-slate-50",
    badge: "bg-slate-200 text-slate-600",
    dot: "bg-slate-400",
  },
  WAITING: {
    border: "border-slate-200 bg-white",
    badge: "bg-slate-100 text-slate-500",
    dot: "bg-slate-300",
  },
  SKIPPED: {
    border: "border-slate-200 bg-slate-50 opacity-75",
    badge: "bg-slate-100 text-slate-500",
    dot: "bg-slate-300",
  },
};

function statusIcon(status: string, kind: FlowNodeKind) {
  if (status === "APPROVED") return <Check className="h-4 w-4" />;
  if (status === "REJECTED") return <ShieldX className="h-4 w-4" />;
  if (status === "PENDING" || status === "IN_REVIEW") return <Clock3 className="h-4 w-4" />;
  if (kind === "start") return <FileUp className="h-4 w-4" />;
  if (kind === "end") return <Flag className="h-4 w-4" />;
  return <Circle className="h-4 w-4" />;
}

const ApprovalStageNode = memo(function ApprovalStageNode({ data }: NodeProps<ApprovalFlowNode>) {
  const colors = STATUS_COLORS[data.status] ?? STATUS_COLORS.WAITING;
  const isStart = data.kind === "start";
  const isEnd = data.kind === "end";

  return (
    <div className={`h-[132px] w-[236px] rounded-2xl border-2 px-4 py-3.5 transition-colors ${colors.border}`}>
      {!isStart ? <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-400" /> : null}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{data.eyebrow}</span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${colors.badge}`}>
          {statusIcon(data.status, data.kind)}
          {data.statusLabel}
        </span>
      </div>
      <div className="mt-2 truncate text-sm font-black text-slate-900" title={data.title}>{data.title}</div>
      <div className="mt-1 text-xs leading-5 text-slate-500">{data.meta}</div>
      {data.people ? (
        <div className="mt-2 flex items-center gap-1.5 border-t border-slate-200/80 pt-2 text-[11px] text-slate-600">
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate" title={data.people}>{data.people}</span>
        </div>
      ) : null}
      {!isEnd ? <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-400" /> : null}
    </div>
  );
});

const nodeTypes: NodeTypes = { approvalStage: ApprovalStageNode };

function stepProgress(step: ApprovalStepInstance) {
  const approved = step.tasks.filter((task) => task.status === "APPROVED").length;
  const pending = step.tasks.filter((task) => task.status === "PENDING").length;
  const required = step.approvalMode === "ALL" ? `全部 ${step.tasks.length} 人` : "任一人";
  if (step.status === "APPROVED") return `${required}｜已完成 ${approved}/${step.tasks.length}`;
  if (step.status === "PENDING") return `${required}｜待處理 ${pending} 人`;
  return `${required}｜共 ${step.tasks.length} 位審核人`;
}

function endTitle(status: string) {
  if (status === "APPROVED") return "審核完成";
  if (status === "REJECTED") return "審核拒絕";
  if (status === "WITHDRAWN") return "案件已撤回";
  if (status === "CANCELLED") return "案件已取消";
  return "等待流程完成";
}

function endStatus(status: string) {
  return status === "IN_REVIEW" ? "WAITING" : status;
}

export default function ApprovalFlowDiagram({ approvalCase }: { approvalCase: ApprovalCaseDetail }) {
  const { nodes, edges } = useMemo(() => {
    const spacing = 300;
    const graphNodes: ApprovalFlowNode[] = [
      {
        id: "submitted",
        type: "approvalStage",
        position: { x: 0, y: 70 },
        draggable: false,
        selectable: false,
        data: {
          kind: "start",
          eyebrow: "START",
          title: "報告正式送審",
          status: "SUBMITTED",
          statusLabel: STATUS_LABELS.SUBMITTED,
          meta: `${approvalCase.submitterDisplayName}｜${new Date(approvalCase.submittedAt).toLocaleString("zh-TW")}`,
        },
      },
    ];

    approvalCase.steps.forEach((step, index) => {
      graphNodes.push({
        id: step.id,
        type: "approvalStage",
        position: { x: spacing * (index + 1), y: 70 },
        draggable: false,
        selectable: false,
        data: {
          kind: "step",
          eyebrow: `STEP ${step.stepOrder}`,
          title: step.name,
          status: step.status,
          statusLabel: STATUS_LABELS[step.status] ?? step.status,
          meta: stepProgress(step),
          people: step.tasks.map((task) => task.approverDisplayName).join("、"),
        },
      });
    });

    const finalStatus = endStatus(approvalCase.status);
    graphNodes.push({
      id: "completed",
      type: "approvalStage",
      position: { x: spacing * (approvalCase.steps.length + 1), y: 70 },
      draggable: false,
      selectable: false,
      data: {
        kind: "end",
        eyebrow: "RESULT",
        title: endTitle(approvalCase.status),
        status: finalStatus,
        statusLabel: STATUS_LABELS[finalStatus] ?? finalStatus,
        meta: approvalCase.completedAt
          ? new Date(approvalCase.completedAt).toLocaleString("zh-TW")
          : "完成所有必要審核後更新",
      },
    });

    const graphEdges: Edge[] = graphNodes.slice(0, -1).map((node, index) => {
      const target = graphNodes[index + 1];
      const targetStatus = target.data.status;
      const isActive = targetStatus === "PENDING" || targetStatus === "IN_REVIEW";
      const isComplete = targetStatus === "APPROVED" || targetStatus === "REJECTED";
      const stroke = isActive ? "#7c3aed" : isComplete ? (targetStatus === "REJECTED" ? "#e11d48" : "#059669") : "#cbd5e1";
      return {
        id: `${node.id}-${target.id}`,
        source: node.id,
        target: target.id,
        type: "straight",
        animated: isActive,
        style: { stroke, strokeWidth: isActive ? 2.5 : 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
      };
    });

    return { nodes: graphNodes, edges: graphEdges };
  }, [approvalCase]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <div className="font-semibold text-slate-900">審核關卡流程</div>
          <div className="text-xs text-slate-500">可拖曳畫布、滾輪縮放；流程內容為送審時的固定版本。</div>
        </div>
        <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
          {[{ label: "目前關卡", color: "bg-violet-500" }, { label: "已完成", color: "bg-emerald-500" }, { label: "等待中", color: "bg-slate-300" }, { label: "已拒絕", color: "bg-rose-500" }].map((item) => (
            <span key={item.label} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${item.color}`} />{item.label}</span>
          ))}
        </div>
      </div>
      <div className="h-[330px] w-full bg-slate-50/60">
        <ReactFlow<ApprovalFlowNode>
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnScroll
          zoomOnPinch
          minZoom={0.35}
          maxZoom={1.4}
          fitView
          fitViewOptions={{ padding: 0.18, maxZoom: 1 }}
          aria-label="報告審核關卡流程圖"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d8dee9" />
          <Controls showInteractive={false} position="bottom-right" />
        </ReactFlow>
      </div>
    </section>
  );
}
