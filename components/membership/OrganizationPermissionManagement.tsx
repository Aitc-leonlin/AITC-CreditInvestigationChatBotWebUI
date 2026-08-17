"use client";

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { Tooltip } from "@mui/material";
import { DataGrid, type GridColDef, type GridRenderCellParams } from "@mui/x-data-grid";
import {
  Building2,
  GitBranch,
  Network,
  Pencil,
  Plus,
  Trash2,
  UserRoundCog,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import MembershipStatusChip from "@/components/membership/MembershipStatusChip";
import { fetchMembershipUsers, type MembershipUser } from "@/services/api/membershipUsersApi";
import { MODULE_PERMISSIONS } from "@/data/modulePermissions";
import { useMembershipPermissions } from "@/hooks/useMembershipPermissions";
import {
  createManagerRelation,
  createOrganizationUnit,
  createPosition,
  createUserDepartmentMapping,
  deleteManagerRelation,
  deleteOrganizationUnit,
  deletePosition,
  deleteUserDepartmentMapping,
  fetchManagerRelations,
  fetchOrganizationTree,
  fetchOrganizationUnits,
  fetchPositions,
  fetchUserDepartmentMappings,
  updateOrganizationUnit,
  updatePosition,
  type ManagerRelation,
  type ManagerRelationPayload,
  type OrganizationUnit,
  type OrganizationUnitPayload,
  type OrganizationUnitType,
  type Position,
  type PositionPayload,
  type Status,
  type UserDepartmentMapping,
  type UserDepartmentMappingPayload,
} from "@/services/api/membershipOrganizationApi";
import { cn } from "@/utils/cn";

type TabKey = "tree" | "positions" | "mappings" | "managers";
type DialogMode = "unit" | "position" | "mapping" | "manager";

const TABS: Array<{ key: TabKey; label: string; icon: typeof Building2 }> = [
  { key: "tree", label: "組織樹", icon: GitBranch },
  { key: "positions", label: "職位", icon: UserRoundCog },
  { key: "mappings", label: "部門對應", icon: Network },
  { key: "managers", label: "主管關係", icon: Building2 },
];

const UNIT_EMPTY: OrganizationUnitPayload = {
  code: "",
  name: "",
  unitType: "DEPARTMENT",
  parentId: null,
  companyId: null,
  managerUserId: null,
  description: "",
  sortOrder: 0,
  status: "ACTIVE",
};

const POSITION_EMPTY: PositionPayload = {
  code: "",
  name: "",
  description: "",
  level: 0,
  sortOrder: 0,
  status: "ACTIVE",
};

const MAPPING_EMPTY: UserDepartmentMappingPayload = {
  userId: "",
  organizationId: "",
  positionId: null,
  isPrimary: true,
  effectiveFrom: null,
  effectiveTo: null,
};

const MANAGER_EMPTY: ManagerRelationPayload = {
  managerUserId: "",
  employeeUserId: "",
  organizationId: null,
  relationType: "DIRECT",
  status: "ACTIVE",
};

export default function OrganizationPermissionManagement() {
  const { hasPermission, isLoading: isPermissionLoading } = useMembershipPermissions();
  const canRead = hasPermission(MODULE_PERMISSIONS.organizationScopeView);
  const canAdd = hasPermission(MODULE_PERMISSIONS.organizationScopeAdd);
  const canEdit = hasPermission(MODULE_PERMISSIONS.organizationScopeEdit);
  const canDelete = hasPermission(MODULE_PERMISSIONS.organizationScopeDelete);
  const [tab, setTab] = useState<TabKey>("tree");
  const [units, setUnits] = useState<OrganizationUnit[]>([]);
  const [tree, setTree] = useState<OrganizationUnit[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [users, setUsers] = useState<MembershipUser[]>([]);
  const [mappings, setMappings] = useState<UserDepartmentMapping[]>([]);
  const [managerRelations, setManagerRelations] = useState<ManagerRelation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<OrganizationUnit | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [unitForm, setUnitForm] = useState<OrganizationUnitPayload>(UNIT_EMPTY);
  const [positionForm, setPositionForm] = useState<PositionPayload>(POSITION_EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [mappingForm, setMappingForm] = useState<UserDepartmentMappingPayload>(MAPPING_EMPTY);
  const [managerForm, setManagerForm] = useState<ManagerRelationPayload>(MANAGER_EMPTY);

  const flatTreeRows = useMemo(() => flattenTree(tree), [tree]);
  const unitManagerScopeId = selectedUnit?.id ?? unitForm.parentId ?? unitForm.companyId ?? "";
  const unitManagerUsers = useMemo(
    () => filterUsersByOrganization(users, units, unitManagerScopeId),
    [users, units, unitManagerScopeId],
  );
  const unitManagerUserIds = useMemo(() => new Set(unitManagerUsers.map((user) => user.id)), [unitManagerUsers]);
  const unitManagerValue = unitForm.managerUserId && unitManagerUserIds.has(unitForm.managerUserId)
    ? unitForm.managerUserId
    : "";

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    try {
      setIsLoading(true);
      const [
        unitRows,
        treeRows,
        positionRows,
        userRows,
        mappingRows,
        managerRows,
      ] = await Promise.all([
        fetchOrganizationUnits(),
        fetchOrganizationTree(),
        fetchPositions(),
        fetchMembershipUsers({ page: 1, pageSize: 200 }),
        fetchUserDepartmentMappings(),
        fetchManagerRelations(),
      ]);
      setUnits(unitRows);
      setTree(treeRows);
      setPositions(positionRows);
      setUsers(userRows.users);
      setMappings(mappingRows);
      setManagerRelations(managerRows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "讀取組織資料失敗");
    } finally {
      setIsLoading(false);
    }
  }

  function openUnit(unit?: OrganizationUnit) {
    if (unit && !canEdit) {
      toast.error("目前帳號沒有 organization-scope.edit 權限。");
      return;
    }
    if (!unit && !canAdd) {
      toast.error("目前帳號沒有 organization-scope.add 權限。");
      return;
    }
    setSelectedUnit(unit ?? null);
    setUnitForm(unit ? toUnitForm(unit) : UNIT_EMPTY);
    setFieldErrors({});
    setDialogMode("unit");
  }

  function openPosition(position?: Position) {
    if (position && !canEdit) {
      toast.error("目前帳號沒有 organization-scope.edit 權限。");
      return;
    }
    if (!position && !canAdd) {
      toast.error("目前帳號沒有 organization-scope.add 權限。");
      return;
    }
    setSelectedPosition(position ?? null);
    setPositionForm(position ? toPositionForm(position) : POSITION_EMPTY);
    setFieldErrors({});
    setDialogMode("position");
  }

  function closeDialog() {
    setDialogMode(null);
    setSelectedUnit(null);
    setSelectedPosition(null);
    setFieldErrors({});
  }

  function updateUnitFormWithManagerScope(nextForm: OrganizationUnitPayload) {
    const nextScopeId = selectedUnit?.id ?? nextForm.parentId ?? nextForm.companyId ?? "";
    const nextManagerUsers = filterUsersByOrganization(users, units, nextScopeId);
    const isManagerInScope = !nextForm.managerUserId || nextManagerUsers.some((user) => user.id === nextForm.managerUserId);
    setUnitForm({
      ...nextForm,
      managerUserId: isManagerInScope ? nextForm.managerUserId : null,
    });
  }

  async function submitUnit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const codeError = getCodeMinLengthError(unitForm.code, "組織代碼");
    if (codeError) {
      setFieldErrors((current) => ({ ...current, unitCode: codeError }));
      toast.error(codeError);
      return;
    }
    if (selectedUnit && !canEdit) {
      toast.error("目前帳號沒有 organization-scope.edit 權限。");
      return;
    }
    if (!selectedUnit && !canAdd) {
      toast.error("目前帳號沒有 organization-scope.add 權限。");
      return;
    }
    try {
      const payload = {
        ...unitForm,
        managerUserId: unitManagerValue || null,
      };
      if (selectedUnit) await updateOrganizationUnit(selectedUnit.id, payload);
      else await createOrganizationUnit(payload);
      toast.success("已儲存組織單位");
      closeDialog();
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "儲存組織單位失敗");
    }
  }

  async function submitPosition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const codeError = getCodeMinLengthError(positionForm.code, "職位代碼");
    if (codeError) {
      setFieldErrors((current) => ({ ...current, positionCode: codeError }));
      toast.error(codeError);
      return;
    }
    if (selectedPosition && !canEdit) {
      toast.error("目前帳號沒有 organization-scope.edit 權限。");
      return;
    }
    if (!selectedPosition && !canAdd) {
      toast.error("目前帳號沒有 organization-scope.add 權限。");
      return;
    }
    try {
      if (selectedPosition) await updatePosition(selectedPosition.id, positionForm);
      else await createPosition(positionForm);
      toast.success("已儲存職位");
      closeDialog();
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "儲存職位失敗");
    }
  }

  async function submitMapping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canAdd) {
      toast.error("目前帳號沒有 organization-scope.add 權限。");
      return;
    }
    try {
      await createUserDepartmentMapping(mappingForm);
      toast.success("已建立使用者部門 Mapping");
      closeDialog();
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "建立使用者部門 Mapping 失敗");
    }
  }

  async function submitManager(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canAdd) {
      toast.error("目前帳號沒有 organization-scope.add 權限。");
      return;
    }
    try {
      await createManagerRelation(managerForm);
      toast.success("已建立 Manager / Employee 關係");
      closeDialog();
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "建立主管關係失敗");
    }
  }

  const unitColumns: GridColDef<OrganizationUnit>[] = [
    {
      field: "name",
      headerName: "組織名稱",
      minWidth: 220,
      flex: 1,
      renderCell: (params) => (
        <span style={{ paddingLeft: `${params.row.level * 18}px` }} className="font-medium text-slate-800">
          {params.row.name}
        </span>
      ),
    },
    { field: "code", headerName: "代碼", minWidth: 130 },
    { field: "unitType", headerName: "類型", minWidth: 120 },
    { field: "managerDisplayName", headerName: "組織主管", minWidth: 140, flex: 0.6 },
    { field: "path", headerName: "Path", minWidth: 220, flex: 1 },
    {
      field: "actions",
      headerName: "操作",
      minWidth: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams<OrganizationUnit>) => (
        <div className="flex h-full items-center gap-1.5">
          {canEdit ? <IconButton title="編輯" onClick={() => openUnit(params.row)}><Pencil className="h-4 w-4" /></IconButton> : null}
          {canDelete ? <IconButton title="刪除" danger onClick={() => void deleteOrganizationUnit(params.row.id).then(loadAll).catch((error) => toast.error(error.message))}><Trash2 className="h-4 w-4" /></IconButton> : null}
        </div>
      ),
    },
  ];

  const positionColumns: GridColDef<Position>[] = [
    { field: "code", headerName: "職位代碼", minWidth: 150 },
    { field: "name", headerName: "職位名稱", minWidth: 180, flex: 1 },
    { field: "level", headerName: "職等", minWidth: 90 },
    { field: "userCount", headerName: "人數", minWidth: 90 },
    { field: "status", headerName: "狀態", minWidth: 100, renderCell: (params) => <div className="flex h-full items-center"><MembershipStatusChip status={params.row.status} /></div> },
    {
      field: "actions",
      headerName: "操作",
      minWidth: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams<Position>) => (
        <div className="flex h-full items-center gap-1.5">
          {canEdit ? <IconButton title="編輯" onClick={() => openPosition(params.row)}><Pencil className="h-4 w-4" /></IconButton> : null}
          {canDelete ? <IconButton title="刪除" danger onClick={() => void deletePosition(params.row.id).then(loadAll).catch((error) => toast.error(error.message))}><Trash2 className="h-4 w-4" /></IconButton> : null}
        </div>
      ),
    },
  ];

  const mappingColumns: GridColDef<UserDepartmentMapping>[] = [
    { field: "displayName", headerName: "使用者", minWidth: 170, flex: 0.8 },
    { field: "organizationName", headerName: "部門/團隊", minWidth: 180, flex: 0.8 },
    { field: "positionName", headerName: "職位", minWidth: 140 },
    { field: "isPrimary", headerName: "主要部門", minWidth: 110, type: "boolean" },
    {
      field: "actions",
      headerName: "操作",
      minWidth: 90,
      sortable: false,
      renderCell: (params: GridRenderCellParams<UserDepartmentMapping>) => canDelete ? (
        <IconButton title="刪除" danger onClick={() => void deleteUserDepartmentMapping(params.row.id).then(loadAll).catch((error) => toast.error(error.message))}><Trash2 className="h-4 w-4" /></IconButton>
      ) : null,
    },
  ];

  const managerColumns: GridColDef<ManagerRelation>[] = [
    { field: "managerDisplayName", headerName: "Manager", minWidth: 170, flex: 0.8 },
    { field: "employeeDisplayName", headerName: "Employee", minWidth: 170, flex: 0.8 },
    { field: "organizationName", headerName: "組織", minWidth: 180, flex: 0.8 },
    { field: "relationType", headerName: "關係", minWidth: 110 },
    { field: "status", headerName: "狀態", minWidth: 100, renderCell: (params) => <div className="flex h-full items-center"><MembershipStatusChip status={params.row.status} /></div> },
    {
      field: "actions",
      headerName: "操作",
      minWidth: 90,
      sortable: false,
      renderCell: (params: GridRenderCellParams<ManagerRelation>) => canDelete ? (
        <IconButton title="刪除" danger onClick={() => void deleteManagerRelation(params.row.id).then(loadAll).catch((error) => toast.error(error.message))}><Trash2 className="h-4 w-4" /></IconButton>
      ) : null,
    },
  ];

  if (isPermissionLoading) return null;

  if (!canRead) {
    return <AccessDenied />;
  }

  return (
    <main className="h-full overflow-hidden bg-[#f8fcff]">
      <div className="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-4 px-5 py-5 md:px-7">
        <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#12344a]">組織管理</h1>
            <p className="mt-1 text-sm text-[#5d7b90]">管理 Company、Department、Team、Position、部門對應與主管關係。</p>
          </div>
          <Button variant="outline" onClick={() => void loadAll()}>重新整理</Button>
        </section>

        <section className="flex flex-wrap gap-2 border-b border-[#d6e8f4] pb-3">
          {TABS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium",
                  tab === item.key
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-[#c7dcea] bg-white text-[#34556b] hover:bg-indigo-50",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </section>

        <section className="min-h-0 overflow-hidden">
          {tab === "tree" ? (
            <Panel
              title="Organization Tree"
              action={canAdd ? <Button onClick={() => openUnit()} className="bg-indigo-600 text-white hover:bg-indigo-700"><Plus className="h-4 w-4" />新增組織</Button> : null}
            >
              <DataGrid rows={flatTreeRows} columns={unitColumns} loading={isLoading} disableRowSelectionOnClick pageSizeOptions={[10, 20, 50]} initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }} />
            </Panel>
          ) : null}

          {tab === "positions" ? (
            <Panel
              title="Position"
              action={canAdd ? <Button onClick={() => openPosition()} className="bg-indigo-600 text-white hover:bg-indigo-700"><Plus className="h-4 w-4" />新增職位</Button> : null}
            >
              <DataGrid rows={positions} columns={positionColumns} loading={isLoading} disableRowSelectionOnClick pageSizeOptions={[10, 20, 50]} initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }} />
            </Panel>
          ) : null}

          {tab === "mappings" ? (
            <Panel
              title="User Department Mapping"
              action={canAdd ? <Button onClick={() => { setMappingForm(MAPPING_EMPTY); setDialogMode("mapping"); }} className="bg-indigo-600 text-white hover:bg-indigo-700"><Plus className="h-4 w-4" />新增 Mapping</Button> : null}
            >
              <DataGrid rows={mappings} columns={mappingColumns} loading={isLoading} disableRowSelectionOnClick pageSizeOptions={[10, 20, 50]} initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }} />
            </Panel>
          ) : null}

          {tab === "managers" ? (
            <Panel
              title="Manager / Employee"
              action={canAdd ? <Button onClick={() => { setManagerForm(MANAGER_EMPTY); setDialogMode("manager"); }} className="bg-indigo-600 text-white hover:bg-indigo-700"><Plus className="h-4 w-4" />新增關係</Button> : null}
            >
              <DataGrid rows={managerRelations} columns={managerColumns} loading={isLoading} disableRowSelectionOnClick pageSizeOptions={[10, 20, 50]} initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }} />
            </Panel>
          ) : null}

        </section>
      </div>

      <Dialog open={dialogMode === "unit"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{selectedUnit ? "修改組織單位" : "新增組織單位"}</DialogTitle></DialogHeader>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={submitUnit}>
            <Field label="代碼" hint="請輸入至少 2 碼，儲存後會自動轉成大寫。" error={fieldErrors.unitCode}>
              <Input
                value={unitForm.code}
                onChange={(event) => {
                  const code = event.target.value;
                  setUnitForm({ ...unitForm, code });
                  if (!getCodeMinLengthError(code, "組織代碼")) {
                    setFieldErrors((current) => ({ ...current, unitCode: "" }));
                  }
                }}
                required
                minLength={2}
                className={cn(fieldErrors.unitCode ? "border-red-500 ring-1 ring-red-200 focus-visible:ring-red-500" : "")}
              />
            </Field>
            <Field label="名稱"><Input value={unitForm.name} onChange={(event) => setUnitForm({ ...unitForm, name: event.target.value })} required /></Field>
            <Field label="類型"><Select value={unitForm.unitType} onChange={(value) => setUnitForm({ ...unitForm, unitType: value as OrganizationUnitType })} options={[["COMPANY", "Company"], ["DEPARTMENT", "Department"], ["TEAM", "Team"]]} /></Field>
            <Field label="上層組織"><Select value={unitForm.parentId ?? ""} onChange={(value) => updateUnitFormWithManagerScope({ ...unitForm, parentId: value || null })} options={unitOptions(units, "不指定")} /></Field>
            <Field label="所屬公司"><Select value={unitForm.companyId ?? ""} onChange={(value) => updateUnitFormWithManagerScope({ ...unitForm, companyId: value || null })} options={unitOptions(units.filter((unit) => unit.unitType === "COMPANY"), "自動/不指定")} /></Field>
            <Field label="部門主管" hint={unitManagerScopeId ? "負責此組織單位的人，只顯示此組織與下層組織內的使用者；不會自動成為員工的直屬主管。" : "負責此組織單位的人；未選上層組織或所屬公司時顯示全部使用者。"}>
              <Select value={unitManagerValue} onChange={(value) => setUnitForm({ ...unitForm, managerUserId: value || null })} options={userOptions(unitManagerUsers, "不指定")} />
            </Field>
            <Field label="排序"><Input type="number" value={unitForm.sortOrder} onChange={(event) => setUnitForm({ ...unitForm, sortOrder: Number(event.target.value) })} /></Field>
            <Field label="狀態"><StatusSelect value={unitForm.status} onChange={(status) => setUnitForm({ ...unitForm, status })} /></Field>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700 md:col-span-2">描述<textarea className="min-h-20 rounded-md border px-3 py-2 text-sm" value={unitForm.description} onChange={(event) => setUnitForm({ ...unitForm, description: event.target.value })} /></label>
            <DialogActions onCancel={closeDialog} className="md:col-span-2" />
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogMode === "position"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedPosition ? "修改職位" : "新增職位"}</DialogTitle></DialogHeader>
          <form className="grid gap-4" onSubmit={submitPosition}>
            <Field label="代碼" hint="請輸入至少 2 碼，儲存後會自動轉成大寫。" error={fieldErrors.positionCode}>
              <Input
                value={positionForm.code}
                onChange={(event) => {
                  const code = event.target.value;
                  setPositionForm({ ...positionForm, code });
                  if (!getCodeMinLengthError(code, "職位代碼")) {
                    setFieldErrors((current) => ({ ...current, positionCode: "" }));
                  }
                }}
                required
                minLength={2}
                className={cn(fieldErrors.positionCode ? "border-red-500 ring-1 ring-red-200 focus-visible:ring-red-500" : "")}
              />
            </Field>
            <Field label="名稱"><Input value={positionForm.name} onChange={(event) => setPositionForm({ ...positionForm, name: event.target.value })} required /></Field>
            <Field label="職等"><Input type="number" value={positionForm.level} onChange={(event) => setPositionForm({ ...positionForm, level: Number(event.target.value) })} /></Field>
            <Field label="排序"><Input type="number" value={positionForm.sortOrder} onChange={(event) => setPositionForm({ ...positionForm, sortOrder: Number(event.target.value) })} /></Field>
            <Field label="狀態"><StatusSelect value={positionForm.status} onChange={(status) => setPositionForm({ ...positionForm, status })} /></Field>
            <Field label="描述"><Input value={positionForm.description} onChange={(event) => setPositionForm({ ...positionForm, description: event.target.value })} /></Field>
            <DialogActions onCancel={closeDialog} />
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogMode === "mapping"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader><DialogTitle>新增 User Department Mapping</DialogTitle></DialogHeader>
          <form className="grid gap-4" onSubmit={submitMapping}>
            <Field label="使用者"><Select value={mappingForm.userId} onChange={(value) => setMappingForm({ ...mappingForm, userId: value })} options={userOptions(users, "請選擇")} required /></Field>
            <Field label="部門/團隊"><Select value={mappingForm.organizationId} onChange={(value) => setMappingForm({ ...mappingForm, organizationId: value })} options={unitOptions(units, "請選擇")} required /></Field>
            <Field label="職位"><Select value={mappingForm.positionId ?? ""} onChange={(value) => setMappingForm({ ...mappingForm, positionId: value || null })} options={positionOptions(positions, "不指定")} /></Field>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={mappingForm.isPrimary} onChange={(event) => setMappingForm({ ...mappingForm, isPrimary: event.target.checked })} />主要部門</label>
            <DialogActions onCancel={closeDialog} />
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogMode === "manager"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader><DialogTitle>新增 Manager / Employee 關係</DialogTitle></DialogHeader>
          <form className="grid gap-4" onSubmit={submitManager}>
            <Field label="Manager"><Select value={managerForm.managerUserId} onChange={(value) => setManagerForm({ ...managerForm, managerUserId: value })} options={userOptions(users, "請選擇")} required /></Field>
            <Field label="Employee"><Select value={managerForm.employeeUserId} onChange={(value) => setManagerForm({ ...managerForm, employeeUserId: value })} options={userOptions(users, "請選擇")} required /></Field>
            <Field label="組織"><Select value={managerForm.organizationId ?? ""} onChange={(value) => setManagerForm({ ...managerForm, organizationId: value || null })} options={unitOptions(units, "不指定")} /></Field>
            <Field label="關係"><Input value={managerForm.relationType} onChange={(event) => setManagerForm({ ...managerForm, relationType: event.target.value })} /></Field>
            <DialogActions onCancel={closeDialog} />
          </form>
        </DialogContent>
      </Dialog>

    </main>
  );
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border border-[#d6e8f4] bg-white">
      <div className="flex items-center justify-between border-b border-[#d6e8f4] px-4 py-3">
        <h2 className="text-sm font-semibold text-[#12344a]">{title}</h2>
        {action}
      </div>
      <div className="min-h-0">{children}</div>
    </div>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
      {error ? <span className="text-xs font-normal leading-5 text-red-600">{error}</span> : null}
      {hint ? <span className="text-xs font-normal leading-5 text-slate-500">{hint}</span> : null}
    </label>
  );
}

function DialogActions({ onCancel, className }: { onCancel: () => void; className?: string }) {
  return (
    <div className={cn("flex justify-end gap-2", className)}>
      <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
      <Button type="submit">儲存</Button>
    </div>
  );
}

function getCodeMinLengthError(code: string, fieldName: string) {
  if (code.trim().length >= 2) return "";
  return `${fieldName}請至少輸入 2 碼。`;
}

function Select({ value, onChange, options, required = false }: { value: string; onChange: (value: string) => void; options: Array<[string, string]>; required?: boolean }) {
  return (
    <select className="h-9 rounded-md border px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)} required={required}>
      {options.map(([optionValue, label]) => <option key={`${optionValue}-${label}`} value={optionValue}>{label}</option>)}
    </select>
  );
}

function StatusSelect({ value, onChange }: { value: Status; onChange: (status: Status) => void }) {
  return <Select value={value} onChange={(next) => onChange(next as Status)} options={[["ACTIVE", "啟用"], ["INACTIVE", "停用"]]} />;
}

function IconButton({ title, onClick, danger = false, children }: { title: string; onClick: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <Tooltip title={title} arrow placement="top">
      <button
        type="button"
        aria-label={title}
        onClick={onClick}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-md border",
          danger ? "border-red-200 text-red-600 hover:bg-red-50" : "border-slate-200 text-slate-600 hover:bg-slate-50",
        )}
      >
        {children}
      </button>
    </Tooltip>
  );
}

function AccessDenied() {
  return (
    <main className="grid h-full place-items-center bg-[#f8fcff] p-6">
      <div className="max-w-md rounded-lg border border-[#d6e8f4] bg-white p-6 text-center">
        <div className="text-lg font-semibold text-[#12344a]">沒有組織管理權限</div>
        <p className="mt-2 text-sm leading-6 text-[#5d7b90]">需要 organization-scope.view 權限才能檢視組織管理設定。</p>
      </div>
    </main>
  );
}

function unitOptions(units: OrganizationUnit[], emptyLabel: string): Array<[string, string]> {
  return [["", emptyLabel], ...units.map((unit) => [unit.id, `${unit.name} (${unit.unitType})`] as [string, string])];
}

function positionOptions(positions: Position[], emptyLabel: string): Array<[string, string]> {
  return [["", emptyLabel], ...positions.map((position) => [position.id, position.name] as [string, string])];
}

function userOptions(users: MembershipUser[], emptyLabel: string): Array<[string, string]> {
  return [["", emptyLabel], ...users.map((user) => [user.id, `${user.displayName} (${user.username})`] as [string, string])];
}

function filterUsersByOrganization(users: MembershipUser[], units: OrganizationUnit[], organizationId: string) {
  if (!organizationId) return users;
  const organizationIds = getOrganizationAndChildIds(units, organizationId);
  return users.filter((user) => {
    const departmentId = user.departmentId ?? user.organizationId;
    return departmentId ? organizationIds.has(departmentId) : false;
  });
}

function getOrganizationAndChildIds(units: OrganizationUnit[], organizationId: string) {
  const target = units.find((unit) => unit.id === organizationId);
  const ids = new Set<string>([organizationId]);
  if (!target) return ids;
  const pathPrefix = `${target.path}/`;
  units.forEach((unit) => {
    if (unit.id === organizationId || unit.path.startsWith(pathPrefix)) ids.add(unit.id);
  });
  return ids;
}

function flattenTree(units: OrganizationUnit[]): OrganizationUnit[] {
  return units.flatMap((unit) => [unit, ...flattenTree(unit.children ?? [])]);
}

function toUnitForm(unit: OrganizationUnit): OrganizationUnitPayload {
  return {
    code: unit.code,
    name: unit.name,
    unitType: unit.unitType,
    parentId: unit.parentId,
    companyId: unit.companyId,
    managerUserId: unit.managerUserId,
    description: unit.description,
    sortOrder: unit.sortOrder,
    status: unit.status,
  };
}

function toPositionForm(position: Position): PositionPayload {
  return {
    code: position.code,
    name: position.name,
    description: position.description,
    level: position.level,
    sortOrder: position.sortOrder,
    status: position.status,
  };
}
