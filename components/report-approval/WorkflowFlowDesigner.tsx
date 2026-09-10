"use client";

import { memo, useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import { AlignHorizontalSpaceAround, Flag, GripVertical, Plus, Settings2, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  ApprovalLookupOption,
  ApprovalLookupOptions,
  ApprovalTarget,
  ApprovalTargetType,
  ApprovalWorkflowStep,
} from "@/types/reportApproval";

const START_NODE_ID = "workflow-start";
const END_NODE_ID = "workflow-end";
const STEP_MIME_TYPE = "application/aitc-approval-step";
const AUTO_LAYOUT_START_X = 280;
const AUTO_LAYOUT_GAP_X = 280;
const AUTO_LAYOUT_Y = 120;

const TARGET_TYPE_OPTIONS: Array<{ value: ApprovalTargetType; label: string }> = [
  { value: "USER", label: "指定會員" },
  { value: "ORGANIZATION", label: "組織單位" },
  { value: "POSITION", label: "職階" },
  { value: "ORGANIZATION_POSITION", label: "單位＋職階" },
  { value: "GROUP", label: "會員群組" },
  { value: "ROLE", label: "RBAC 角色" },
];

type WorkflowNodeData = {
  kind: "start" | "step" | "end";
  order?: number;
  title: string;
  mode?: "ANY_ONE" | "ALL";
  targetCount?: number;
  selected?: boolean;
};

type WorkflowNode = Node<WorkflowNodeData, "workflowStage">;

function stepKey(step: ApprovalWorkflowStep, index: number) {
  return step.id || step.clientId || `draft-step-${index + 1}`;
}

function emptyTarget(): ApprovalTarget {
  return {
    targetType: "USER",
    targetId: "",
    secondaryTargetId: null,
    targetLabel: "",
    includeDescendants: false,
  };
}

function createDraftId() {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function targetOptions(type: ApprovalTargetType, options: ApprovalLookupOptions) {
  if (type === "USER") return options.users;
  if (type === "ORGANIZATION" || type === "ORGANIZATION_POSITION") return options.organizations;
  if (type === "POSITION") return options.positions;
  if (type === "GROUP") return options.groups;
  return options.roles;
}

const WorkflowStageNode = memo(function WorkflowStageNode({ data }: NodeProps<WorkflowNode>) {
  if (data.kind !== "step") {
    const isStart = data.kind === "start";
    return (
      <div className={`flex h-[96px] w-[154px] items-center gap-3 rounded-2xl border-2 px-4 py-3 shadow-sm ${isStart ? "border-sky-300 bg-sky-50" : "border-emerald-300 bg-emerald-50"}`}>
        {!isStart ? <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-white !bg-emerald-500" /> : null}
        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-white ${isStart ? "bg-sky-500" : "bg-emerald-500"}`}>
          {isStart ? <GripVertical className="h-4 w-4" /> : <Flag className="h-4 w-4" />}
        </span>
        <div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{isStart ? "START" : "RESULT"}</div><div className="text-sm font-black text-slate-800">{data.title}</div></div>
        {isStart ? <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-white !bg-sky-500" /> : null}
      </div>
    );
  }

  return (
    <div className={`h-[96px] w-[220px] rounded-2xl border-2 bg-white px-4 py-3 shadow-sm transition ${data.selected ? "border-violet-500 shadow-[0_12px_28px_rgba(124,58,237,0.18)]" : "border-slate-200 hover:border-violet-300"}`}>
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-white !bg-violet-500" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-500">STEP {data.order}</div>
          <div className="mt-1 max-w-[150px] truncate text-sm font-black text-slate-900" title={data.title}>{data.title}</div>
        </div>
        <Settings2 className="h-4 w-4 text-slate-400" />
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
        <span>{data.mode === "ALL" ? "全部人通過" : "任一人通過"}</span>
        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{data.targetCount ?? 0} 組條件</span>
      </div>
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-white !bg-violet-500" />
    </div>
  );
});

const nodeTypes: NodeTypes = { workflowStage: WorkflowStageNode };

function buildNodes(steps: ApprovalWorkflowStep[], selectedId: string): WorkflowNode[] {
  const stageNodes = steps.map((step, index): WorkflowNode => ({
    id: stepKey(step, index),
    type: "workflowStage",
    position: {
      x: Number.isFinite(step.canvasX) ? Number(step.canvasX) : 280 * (index + 1),
      y: AUTO_LAYOUT_Y,
    },
    data: {
      kind: "step",
      order: index + 1,
      title: step.name,
      mode: step.approvalMode,
      targetCount: step.targets.length,
      selected: stepKey(step, index) === selectedId,
    },
  }));
  const xs = stageNodes.map((node) => node.position.x);
  const minX = xs.length ? Math.min(...xs) : 280;
  const maxX = xs.length ? Math.max(...xs) : 280;
  return [
    {
      id: START_NODE_ID,
      type: "workflowStage",
      position: { x: minX - 230, y: AUTO_LAYOUT_Y },
      draggable: false,
      selectable: false,
      data: { kind: "start", title: "報告送審" },
    },
    ...stageNodes,
    {
      id: END_NODE_ID,
      type: "workflowStage",
      position: { x: maxX + 300, y: AUTO_LAYOUT_Y },
      draggable: false,
      selectable: false,
      data: { kind: "end", title: "流程完成" },
    },
  ];
}

function buildEdges(steps: ApprovalWorkflowStep[]): Edge[] {
  const ids = [START_NODE_ID, ...steps.map(stepKey), END_NODE_ID];
  return ids.slice(0, -1).map((source, index) => ({
    id: `route-${source}-${ids[index + 1]}`,
    source,
    target: ids[index + 1],
    type: "straight",
    style: { stroke: "#7c3aed", strokeWidth: 2.2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#7c3aed" },
  }));
}

function WorkflowFlowDesignerCanvas({
  steps,
  options,
  onChange,
}: {
  steps: ApprovalWorkflowStep[];
  options: ApprovalLookupOptions;
  onChange: (steps: ApprovalWorkflowStep[]) => void;
}) {
  const [selectedId, setSelectedId] = useState(() => stepKey(steps[0], 0));
  const [nodes, setNodes] = useState<WorkflowNode[]>(() => buildNodes(steps, selectedId));
  const { screenToFlowPosition, fitView } = useReactFlow<WorkflowNode>();

  useEffect(() => {
    if (!steps.some((step, index) => stepKey(step, index) === selectedId)) {
      setSelectedId(stepKey(steps[0], 0));
      return;
    }
    setNodes(buildNodes(steps, selectedId));
  }, [selectedId, steps]);

  const edges = useMemo(() => buildEdges(steps), [steps]);
  const selectedIndex = steps.findIndex((step, index) => stepKey(step, index) === selectedId);
  const selectedStep = steps[selectedIndex];

  const handleNodesChange = useCallback((changes: NodeChange<WorkflowNode>[]) => {
    setNodes((current) => applyNodeChanges(changes, current));
  }, []);

  function updateSelected(update: Partial<ApprovalWorkflowStep>) {
    if (selectedIndex < 0) return;
    onChange(steps.map((step, index) => index === selectedIndex ? { ...step, ...update } : step));
  }

  function updateTarget(targetIndex: number, update: Partial<ApprovalTarget>) {
    if (!selectedStep) return;
    updateSelected({
      targets: selectedStep.targets.map((target, index) => index === targetIndex ? { ...target, ...update } : target),
    });
  }

  function addStepAt(position: { x: number; y: number }) {
    const clientId = createDraftId();
    const nextStep: ApprovalWorkflowStep = {
      clientId,
      name: `第 ${steps.length + 1} 關審核`,
      approvalMode: "ANY_ONE",
      rejectPolicy: "RETURN_TO_SUBMITTER",
      targets: [emptyTarget()],
      canvasX: Math.round(position.x),
      canvasY: AUTO_LAYOUT_Y,
    };
    const nextSteps = [...steps, nextStep].sort((left, right) => Number(left.canvasX ?? 0) - Number(right.canvasX ?? 0));
    setSelectedId(clientId);
    onChange(nextSteps);
    window.setTimeout(() => void fitView({ padding: 0.15, duration: 250 }), 0);
  }

  function addStepAfterLast() {
    const maxX = Math.max(...steps.map((step, index) => Number(step.canvasX ?? 280 * (index + 1))), 0);
    addStepAt({ x: maxX + 280, y: 120 });
  }

  function autoArrange() {
    onChange(steps.map((step, index) => ({
      ...step,
      canvasX: AUTO_LAYOUT_START_X + AUTO_LAYOUT_GAP_X * index,
      canvasY: AUTO_LAYOUT_Y,
    })));
    window.setTimeout(() => void fitView({ padding: 0.15, duration: 350, maxZoom: 1 }), 0);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (event.dataTransfer.getData(STEP_MIME_TYPE) !== "approval-step") return;
    addStepAt(screenToFlowPosition({ x: event.clientX, y: event.clientY }));
  }

  function onDragStart(event: DragEvent<HTMLDivElement>) {
    event.dataTransfer.setData(STEP_MIME_TYPE, "approval-step");
    event.dataTransfer.effectAllowed = "move";
  }

  function handleNodeDragStop(_: unknown, draggedNode: WorkflowNode) {
    if (draggedNode.data.kind !== "step") return;
    const positions = new Map(
      nodes.filter((node) => node.data.kind === "step").map((node) => [node.id, node.id === draggedNode.id ? draggedNode.position : node.position]),
    );
    const nextSteps = steps
      .map((step, index) => {
        const position = positions.get(stepKey(step, index));
        return position ? { ...step, canvasX: Math.round(position.x), canvasY: AUTO_LAYOUT_Y } : step;
      })
      .sort((left, right) => Number(left.canvasX ?? 0) - Number(right.canvasX ?? 0));
    onChange(nextSteps);
  }

  function reorderByConnection(connection: Connection) {
    const { source, target } = connection;
    if (!source || !target || source === target) return;
    const keyed = steps.map((step, index) => ({ step, key: stepKey(step, index) }));
    let movingKey = target;
    let insertAfterKey = source;
    if (source === START_NODE_ID) {
      movingKey = target;
      insertAfterKey = START_NODE_ID;
    } else if (target === END_NODE_ID) {
      movingKey = source;
      insertAfterKey = keyed.filter((item) => item.key !== movingKey).at(-1)?.key ?? START_NODE_ID;
    }
    if ([START_NODE_ID, END_NODE_ID].includes(movingKey)) return;
    const moving = keyed.find((item) => item.key === movingKey);
    if (!moving) return;
    const remaining = keyed.filter((item) => item.key !== movingKey);
    const insertIndex = insertAfterKey === START_NODE_ID
      ? 0
      : Math.max(0, remaining.findIndex((item) => item.key === insertAfterKey) + 1);
    remaining.splice(insertIndex, 0, moving);
    const nextSteps = remaining.map((item, index) => ({
      ...item.step,
      canvasX: 280 * (index + 1),
      canvasY: AUTO_LAYOUT_Y,
    }));
    onChange(nextSteps);
    window.setTimeout(() => void fitView({ padding: 0.15, duration: 250 }), 0);
  }

  function removeSelected() {
    if (selectedIndex < 0 || steps.length <= 1) return;
    const next = steps.filter((_, index) => index !== selectedIndex);
    setSelectedId(stepKey(next[Math.max(0, selectedIndex - 1)], Math.max(0, selectedIndex - 1)));
    onChange(next);
  }

  return (
    <div className="grid min-h-[620px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 xl:grid-cols-[180px_minmax(520px,1fr)_360px]">
      <aside className="border-b border-slate-200 bg-white p-4 xl:border-b-0 xl:border-r">
        <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">節點工具箱</div>
        <div
          draggable
          onDragStart={onDragStart}
          className="mt-3 cursor-grab rounded-xl border-2 border-dashed border-violet-300 bg-violet-50 p-3 text-violet-800 active:cursor-grabbing"
        >
          <div className="flex items-center gap-2 text-sm font-bold"><GripVertical className="h-4 w-4" />審核關卡</div>
          <div className="mt-1 text-[11px] leading-5 text-violet-600">拖曳到中間畫布新增</div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addStepAfterLast} className="mt-3 w-full">
          <Plus className="h-4 w-4" />快速新增
        </Button>
        <Button type="button" size="sm" onClick={autoArrange} className="mt-2 w-full bg-violet-600 text-white hover:bg-violet-700">
          <AlignHorizontalSpaceAround className="h-4 w-4" />自動排列
        </Button>
        <div className="mt-5 space-y-2 text-[11px] leading-5 text-slate-500">
          <p>拖動節點可調整畫面位置，左右順序就是實際審核順序。</p>
          <p>也可從節點右側連到另一節點左側，快速調整先後。</p>
          <p>自動排列會固定垂直高度，依目前關卡順序水平對齊。</p>
          <p>目前僅支援單一路線，尚不開放分支。</p>
        </div>
      </aside>

      <div
        className="h-[620px] min-w-0 bg-slate-50/70"
        onDrop={onDrop}
        onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
      >
        <ReactFlow<WorkflowNode>
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={handleNodesChange}
          onNodeClick={(_, node) => { if (node.data.kind === "step") setSelectedId(node.id); }}
          onNodeDragStop={handleNodeDragStop}
          onConnect={reorderByConnection}
          isValidConnection={({ source, target }) => Boolean(source && target && source !== target && source !== END_NODE_ID && target !== START_NODE_ID)}
          nodesConnectable
          deleteKeyCode={null}
          minZoom={0.35}
          maxZoom={1.5}
          fitView
          fitViewOptions={{ padding: 0.16, maxZoom: 1 }}
          aria-label="審核流程設計畫布"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#cbd5e1" />
          <Controls showInteractive={false} position="bottom-right" />
        </ReactFlow>
      </div>

      <aside className="max-h-[620px] overflow-y-auto border-t border-slate-200 bg-white p-4 xl:border-l xl:border-t-0">
        {selectedStep ? (
          <div>
            <div className="flex items-center justify-between gap-3">
              <div><div className="text-xs font-bold uppercase tracking-[0.16em] text-violet-500">STEP {selectedIndex + 1}</div><div className="mt-1 font-bold text-slate-900">關卡設定</div></div>
              <Button type="button" variant="outline" size="icon" onClick={removeSelected} disabled={steps.length <= 1} className="text-rose-600"><Trash2 className="h-4 w-4" /></Button>
            </div>
            <label className="mt-4 block space-y-1.5 text-sm font-medium text-slate-700">關卡名稱<Input value={selectedStep.name} onChange={(event) => updateSelected({ name: event.target.value })} /></label>
            <label className="mt-3 block space-y-1.5 text-sm font-medium text-slate-700">通過條件<select value={selectedStep.approvalMode} onChange={(event) => updateSelected({ approvalMode: event.target.value as "ANY_ONE" | "ALL" })} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="ANY_ONE">任一人通過</option><option value="ALL">全部人通過</option></select></label>
            <div className="mt-5 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between"><div className="text-sm font-bold text-slate-900">審核對象</div><Button type="button" variant="outline" size="sm" onClick={() => updateSelected({ targets: [...selectedStep.targets, emptyTarget()] })}><Plus className="h-3.5 w-3.5" />新增加</Button></div>
              <div className="mt-3 space-y-3">
                {selectedStep.targets.map((target, targetIndex) => {
                  const list = targetOptions(target.targetType, options);
                  return (
                    <div key={target.id ?? targetIndex} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center gap-2">
                        <select value={target.targetType} onChange={(event) => updateTarget(targetIndex, { targetType: event.target.value as ApprovalTargetType, targetId: "", secondaryTargetId: null, targetLabel: "", includeDescendants: false })} className="h-9 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 text-xs">{TARGET_TYPE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
                        <Button type="button" variant="ghost" size="icon" onClick={() => { const next = selectedStep.targets.filter((_, index) => index !== targetIndex); updateSelected({ targets: next.length ? next : [emptyTarget()] }); }} className="h-8 w-8 text-rose-600"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                      <select value={target.targetId} onChange={(event) => { const selected = list.find((item) => item.id === event.target.value); updateTarget(targetIndex, { targetId: event.target.value, targetLabel: selected?.label ?? "" }); }} className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs"><option value="">選擇審核對象</option>{list.map((item: ApprovalLookupOption) => <option key={item.id} value={item.id}>{item.label}{item.code ? `（${item.code}）` : ""}</option>)}</select>
                      {target.targetType === "ORGANIZATION_POSITION" ? <select value={target.secondaryTargetId ?? ""} onChange={(event) => { const selected = options.positions.find((item) => item.id === event.target.value); updateTarget(targetIndex, { secondaryTargetId: event.target.value, targetLabel: `${target.targetLabel.split("＋")[0]}＋${selected?.label ?? ""}` }); }} className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs"><option value="">選擇職階</option>{options.positions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select> : null}
                      {target.targetType === "ORGANIZATION" || target.targetType === "ORGANIZATION_POSITION" ? <label className="mt-2 flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={target.includeDescendants} onChange={(event) => updateTarget(targetIndex, { includeDescendants: event.target.checked })} />包含所有下層單位</label> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : <div className="flex h-full items-center justify-center text-sm text-slate-500">請點選一個審核關卡</div>}
      </aside>
    </div>
  );
}

export default function WorkflowFlowDesigner(props: {
  steps: ApprovalWorkflowStep[];
  options: ApprovalLookupOptions;
  onChange: (steps: ApprovalWorkflowStep[]) => void;
}) {
  return <ReactFlowProvider><WorkflowFlowDesignerCanvas {...props} /></ReactFlowProvider>;
}
