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
  Rows3,
  ShieldCheck,
  TableProperties,
  Trash2,
  UserRoundCog,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { fetchRoles, type Role } from "@/services/api/membershipRbacApi";
import { fetchMembershipUsers, type MembershipUser } from "@/services/api/membershipUsersApi";
import { MODULE_PERMISSIONS } from "@/data/modulePermissions";
import { useMembershipPermissions } from "@/hooks/useMembershipPermissions";
import {
  createManagerRelation,
  createOrganizationUnit,
  createPosition,
  createRowRule,
  createUserDepartmentMapping,
  deleteDataPolicy,
  deleteFieldRule,
  deleteManagerRelation,
  deleteMaskingRule,
  deleteOrganizationUnit,
  deletePosition,
  deleteRowRule,
  deleteUserDepartmentMapping,
  fetchDataPolicies,
  fetchFieldRules,
  fetchManagerRelations,
  fetchMaskingRules,
  fetchOrganizationTree,
  fetchOrganizationUnits,
  fetchPositions,
  fetchRowRules,
  fetchUserDepartmentMappings,
  saveDataPolicy,
  saveFieldRule,
  saveMaskingRule,
  updateOrganizationUnit,
  updatePosition,
  type DataPermissionPolicy,
  type DataPermissionPolicyPayload,
  type DataScope,
  type FieldPermissionRule,
  type FieldPermissionRulePayload,
  type ManagerRelation,
  type ManagerRelationPayload,
  type MaskingRule,
  type MaskingRulePayload,
  type OrganizationUnit,
  type OrganizationUnitPayload,
  type OrganizationUnitType,
  type Position,
  type PositionPayload,
  type RowPermissionRule,
  type RowPermissionRulePayload,
  type Status,
  type UserDepartmentMapping,
  type UserDepartmentMappingPayload,
} from "@/services/api/membershipOrganizationApi";
import { cn } from "@/utils/cn";

type TabKey = "tree" | "positions" | "mappings" | "managers" | "policies" | "rules";
type DialogMode = "unit" | "position" | "mapping" | "manager" | "policy" | "row" | "field" | "masking";

const TABS: Array<{ key: TabKey; label: string; icon: typeof Building2 }> = [
  { key: "tree", label: "組織樹", icon: GitBranch },
  { key: "positions", label: "職位", icon: UserRoundCog },
  { key: "policies", label: "Data Scope", icon: TableProperties },
  { key: "rules", label: "列欄遮罩", icon: Rows3 },
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

const POLICY_EMPTY: DataPermissionPolicyPayload = {
  subjectType: "ROLE",
  subjectId: "",
  resourceCode: "membership_user",
  dataScope: "ONLY_MYSELF",
  customScope: [],
  rowRule: {},
  fieldRule: {},
  maskingRule: {},
  status: "ACTIVE",
};

const ROW_RULE_EMPTY: RowPermissionRulePayload = {
  policyId: "",
  resourceCode: "membership_user",
  ruleName: "",
  expression: {},
  effect: "ALLOW",
  status: "ACTIVE",
};

const FIELD_RULE_EMPTY: FieldPermissionRulePayload = {
  policyId: "",
  resourceCode: "membership_user",
  fieldName: "",
  canRead: true,
  canWrite: false,
  status: "ACTIVE",
};

const MASKING_RULE_EMPTY: MaskingRulePayload = {
  policyId: "",
  resourceCode: "membership_user",
  fieldName: "",
  maskingType: "PARTIAL",
  maskingPattern: "***",
  status: "ACTIVE",
};

const DATA_SCOPE_OPTIONS: Array<{ value: DataScope; label: string }> = [
  { value: "ONLY_MYSELF", label: "Only Myself" },
  { value: "SAME_DEPARTMENT", label: "Same Department" },
  { value: "SUB_DEPARTMENT", label: "Sub Department" },
  { value: "WHOLE_COMPANY", label: "Whole Company" },
  { value: "CUSTOM", label: "Custom Scope" },
];

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
  const [roles, setRoles] = useState<Role[]>([]);
  const [mappings, setMappings] = useState<UserDepartmentMapping[]>([]);
  const [managerRelations, setManagerRelations] = useState<ManagerRelation[]>([]);
  const [policies, setPolicies] = useState<DataPermissionPolicy[]>([]);
  const [rowRules, setRowRules] = useState<RowPermissionRule[]>([]);
  const [fieldRules, setFieldRules] = useState<FieldPermissionRule[]>([]);
  const [maskingRules, setMaskingRules] = useState<MaskingRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<OrganizationUnit | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [unitForm, setUnitForm] = useState<OrganizationUnitPayload>(UNIT_EMPTY);
  const [positionForm, setPositionForm] = useState<PositionPayload>(POSITION_EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [mappingForm, setMappingForm] = useState<UserDepartmentMappingPayload>(MAPPING_EMPTY);
  const [managerForm, setManagerForm] = useState<ManagerRelationPayload>(MANAGER_EMPTY);
  const [policyForm, setPolicyForm] = useState<DataPermissionPolicyPayload>(POLICY_EMPTY);
  const [rowRuleForm, setRowRuleForm] = useState<RowPermissionRulePayload>(ROW_RULE_EMPTY);
  const [fieldRuleForm, setFieldRuleForm] = useState<FieldPermissionRulePayload>(FIELD_RULE_EMPTY);
  const [maskingRuleForm, setMaskingRuleForm] = useState<MaskingRulePayload>(MASKING_RULE_EMPTY);

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
        roleRows,
        mappingRows,
        managerRows,
        policyRows,
        rowRuleRows,
        fieldRuleRows,
        maskingRuleRows,
      ] = await Promise.all([
        fetchOrganizationUnits(),
        fetchOrganizationTree(),
        fetchPositions(),
        fetchMembershipUsers({ page: 1, pageSize: 200 }),
        fetchRoles(),
        fetchUserDepartmentMappings(),
        fetchManagerRelations(),
        fetchDataPolicies(),
        fetchRowRules(),
        fetchFieldRules(),
        fetchMaskingRules(),
      ]);
      setUnits(unitRows);
      setTree(treeRows);
      setPositions(positionRows);
      setUsers(userRows.users);
      setRoles(roleRows);
      setMappings(mappingRows);
      setManagerRelations(managerRows);
      setPolicies(policyRows);
      setRowRules(rowRuleRows);
      setFieldRules(fieldRuleRows);
      setMaskingRules(maskingRuleRows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "讀取組織資料權限失敗");
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

  async function submitPolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canAdd) {
      toast.error("目前帳號沒有 organization-scope.add 權限。");
      return;
    }
    try {
      await saveDataPolicy(policyForm);
      toast.success("已儲存 Data Scope 設定");
      closeDialog();
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "儲存 Data Scope 失敗");
    }
  }

  async function submitRowRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canAdd) {
      toast.error("目前帳號沒有 organization-scope.add 權限。");
      return;
    }
    try {
      await createRowRule(rowRuleForm);
      toast.success("已建立 Row-level Permission");
      closeDialog();
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "建立 Row-level Permission 失敗");
    }
  }

  async function submitFieldRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canAdd) {
      toast.error("目前帳號沒有 organization-scope.add 權限。");
      return;
    }
    try {
      await saveFieldRule(fieldRuleForm);
      toast.success("已儲存 Field-level Permission");
      closeDialog();
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "儲存 Field-level Permission 失敗");
    }
  }

  async function submitMaskingRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canAdd) {
      toast.error("目前帳號沒有 organization-scope.add 權限。");
      return;
    }
    try {
      await saveMaskingRule(maskingRuleForm);
      toast.success("已儲存 Sensitive Data Masking");
      closeDialog();
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "儲存 Sensitive Data Masking 失敗");
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
    { field: "status", headerName: "狀態", minWidth: 100 },
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
    { field: "status", headerName: "狀態", minWidth: 100 },
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

  const policyColumns: GridColDef<DataPermissionPolicy>[] = [
    { field: "resourceCode", headerName: "Resource", minWidth: 170, flex: 0.7 },
    { field: "subjectName", headerName: "Subject", minWidth: 170, flex: 0.8 },
    { field: "subjectType", headerName: "類型", minWidth: 100 },
    { field: "dataScope", headerName: "Data Scope", minWidth: 170 },
    { field: "status", headerName: "狀態", minWidth: 100 },
    {
      field: "actions",
      headerName: "操作",
      minWidth: 90,
      sortable: false,
      renderCell: (params: GridRenderCellParams<DataPermissionPolicy>) => canDelete ? (
        <IconButton title="刪除" danger onClick={() => void deleteDataPolicy(params.row.id).then(loadAll).catch((error) => toast.error(error.message))}><Trash2 className="h-4 w-4" /></IconButton>
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
            <h1 className="text-2xl font-semibold text-[#12344a]">組織與資料權限</h1>
            <p className="mt-1 text-sm text-[#5d7b90]">管理 Company、Department、Team、Position、資料範圍與欄列遮罩規則。</p>
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
              <DataGrid rows={flatTreeRows} columns={unitColumns} loading={isLoading} disableRowSelectionOnClick />
            </Panel>
          ) : null}

          {tab === "positions" ? (
            <Panel
              title="Position"
              action={canAdd ? <Button onClick={() => openPosition()} className="bg-indigo-600 text-white hover:bg-indigo-700"><Plus className="h-4 w-4" />新增職位</Button> : null}
            >
              <DataGrid rows={positions} columns={positionColumns} loading={isLoading} disableRowSelectionOnClick />
            </Panel>
          ) : null}

          {tab === "mappings" ? (
            <Panel
              title="User Department Mapping"
              action={canAdd ? <Button onClick={() => { setMappingForm(MAPPING_EMPTY); setDialogMode("mapping"); }} className="bg-indigo-600 text-white hover:bg-indigo-700"><Plus className="h-4 w-4" />新增 Mapping</Button> : null}
            >
              <DataGrid rows={mappings} columns={mappingColumns} loading={isLoading} disableRowSelectionOnClick />
            </Panel>
          ) : null}

          {tab === "managers" ? (
            <Panel
              title="Manager / Employee"
              action={canAdd ? <Button onClick={() => { setManagerForm(MANAGER_EMPTY); setDialogMode("manager"); }} className="bg-indigo-600 text-white hover:bg-indigo-700"><Plus className="h-4 w-4" />新增關係</Button> : null}
            >
              <DataGrid rows={managerRelations} columns={managerColumns} loading={isLoading} disableRowSelectionOnClick />
            </Panel>
          ) : null}

          {tab === "policies" ? (
            <Panel
              title="Data Scope"
              action={canAdd ? <Button onClick={() => { setPolicyForm(POLICY_EMPTY); setDialogMode("policy"); }} className="bg-indigo-600 text-white hover:bg-indigo-700"><Plus className="h-4 w-4" />新增 Scope</Button> : null}
            >
              <DataGrid rows={policies} columns={policyColumns} loading={isLoading} disableRowSelectionOnClick />
            </Panel>
          ) : null}

          {tab === "rules" ? (
            <div className="grid h-full min-h-0 gap-4 lg:grid-cols-3">
              <RulePanel title="Row-level Permission" rows={rowRules} canAdd={canAdd} canDelete={canDelete} onAdd={() => { setRowRuleForm(ROW_RULE_EMPTY); setDialogMode("row"); }} onDelete={(id) => void deleteRowRule(id).then(loadAll).catch((error) => toast.error(error.message))} />
              <RulePanel title="Field-level Permission" rows={fieldRules} canAdd={canAdd} canDelete={canDelete} onAdd={() => { setFieldRuleForm(FIELD_RULE_EMPTY); setDialogMode("field"); }} onDelete={(id) => void deleteFieldRule(id).then(loadAll).catch((error) => toast.error(error.message))} />
              <RulePanel title="Sensitive Data Masking" rows={maskingRules} canAdd={canAdd} canDelete={canDelete} onAdd={() => { setMaskingRuleForm(MASKING_RULE_EMPTY); setDialogMode("masking"); }} onDelete={(id) => void deleteMaskingRule(id).then(loadAll).catch((error) => toast.error(error.message))} />
            </div>
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

      <Dialog open={dialogMode === "policy"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Data Scope 設定</DialogTitle></DialogHeader>
          {/* NOTE: 目前資料權限設定只會寫入 policy/rule/masking tables，尚未套用到其他業務 API 的資料過濾或遮罩。 */}
          <form className="grid gap-4 md:grid-cols-2" onSubmit={submitPolicy}>
            <Field label="Subject Type"><Select value={policyForm.subjectType} onChange={(value) => setPolicyForm({ ...policyForm, subjectType: value as "ROLE" | "USER", subjectId: "" })} options={[["ROLE", "Role"], ["USER", "User"]]} /></Field>
            <Field label="Subject"><Select value={policyForm.subjectId} onChange={(value) => setPolicyForm({ ...policyForm, subjectId: value })} options={policyForm.subjectType === "ROLE" ? roleOptions(roles, "請選擇") : userOptions(users, "請選擇")} required /></Field>
            <Field label="Resource"><Input value={policyForm.resourceCode} onChange={(event) => setPolicyForm({ ...policyForm, resourceCode: event.target.value })} required /></Field>
            <Field label="Data Scope"><Select value={policyForm.dataScope} onChange={(value) => setPolicyForm({ ...policyForm, dataScope: value as DataScope })} options={DATA_SCOPE_OPTIONS.map((item) => [item.value, item.label])} /></Field>
            <Field label="Custom Scope">
              <select
                multiple
                className="min-h-28 rounded-md border px-3 py-2 text-sm"
                value={policyForm.customScope}
                onChange={(event) => setPolicyForm({ ...policyForm, customScope: Array.from(event.target.selectedOptions).map((option) => option.value) })}
              >
                {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
              </select>
            </Field>
            <Field label="狀態"><StatusSelect value={policyForm.status} onChange={(status) => setPolicyForm({ ...policyForm, status })} /></Field>
            <JsonField label="Row Rule JSON" value={policyForm.rowRule} onChange={(value) => setPolicyForm({ ...policyForm, rowRule: value })} />
            <JsonField label="Field Rule JSON" value={policyForm.fieldRule} onChange={(value) => setPolicyForm({ ...policyForm, fieldRule: value })} />
            <JsonField label="Masking Rule JSON" value={policyForm.maskingRule} onChange={(value) => setPolicyForm({ ...policyForm, maskingRule: value })} />
            <DialogActions onCancel={closeDialog} className="md:col-span-2" />
          </form>
        </DialogContent>
      </Dialog>

      <RuleDialogs
        dialogMode={dialogMode}
        closeDialog={closeDialog}
        policies={policies}
        rowRuleForm={rowRuleForm}
        setRowRuleForm={setRowRuleForm}
        submitRowRule={submitRowRule}
        fieldRuleForm={fieldRuleForm}
        setFieldRuleForm={setFieldRuleForm}
        submitFieldRule={submitFieldRule}
        maskingRuleForm={maskingRuleForm}
        setMaskingRuleForm={setMaskingRuleForm}
        submitMaskingRule={submitMaskingRule}
      />
    </main>
  );
}

function RuleDialogs(props: {
  dialogMode: DialogMode | null;
  closeDialog: () => void;
  policies: DataPermissionPolicy[];
  rowRuleForm: RowPermissionRulePayload;
  setRowRuleForm: (value: RowPermissionRulePayload) => void;
  submitRowRule: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  fieldRuleForm: FieldPermissionRulePayload;
  setFieldRuleForm: (value: FieldPermissionRulePayload) => void;
  submitFieldRule: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  maskingRuleForm: MaskingRulePayload;
  setMaskingRuleForm: (value: MaskingRulePayload) => void;
  submitMaskingRule: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  const policyOptions: Array<[string, string]> = props.policies.map((policy) => [
    policy.id,
    `${policy.resourceCode} / ${policy.subjectName ?? policy.subjectId}`,
  ]);
  return (
    <>
      <Dialog open={props.dialogMode === "row"} onOpenChange={(open) => !open && props.closeDialog()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Row-level Permission</DialogTitle></DialogHeader>
          <form className="grid gap-4" onSubmit={props.submitRowRule}>
            <Field label="Policy"><Select value={props.rowRuleForm.policyId} onChange={(value) => props.setRowRuleForm({ ...props.rowRuleForm, policyId: value })} options={[["", "請選擇"], ...policyOptions]} required /></Field>
            <Field label="Resource"><Input value={props.rowRuleForm.resourceCode} onChange={(event) => props.setRowRuleForm({ ...props.rowRuleForm, resourceCode: event.target.value })} required /></Field>
            <Field label="Rule Name"><Input value={props.rowRuleForm.ruleName} onChange={(event) => props.setRowRuleForm({ ...props.rowRuleForm, ruleName: event.target.value })} required /></Field>
            <JsonField label="Expression JSON" value={props.rowRuleForm.expression} onChange={(value) => props.setRowRuleForm({ ...props.rowRuleForm, expression: value })} />
            <DialogActions onCancel={props.closeDialog} />
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={props.dialogMode === "field"} onOpenChange={(open) => !open && props.closeDialog()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Field-level Permission</DialogTitle></DialogHeader>
          <form className="grid gap-4" onSubmit={props.submitFieldRule}>
            <Field label="Policy"><Select value={props.fieldRuleForm.policyId} onChange={(value) => props.setFieldRuleForm({ ...props.fieldRuleForm, policyId: value })} options={[["", "請選擇"], ...policyOptions]} required /></Field>
            <Field label="Resource"><Input value={props.fieldRuleForm.resourceCode} onChange={(event) => props.setFieldRuleForm({ ...props.fieldRuleForm, resourceCode: event.target.value })} required /></Field>
            <Field label="Field"><Input value={props.fieldRuleForm.fieldName} onChange={(event) => props.setFieldRuleForm({ ...props.fieldRuleForm, fieldName: event.target.value })} required /></Field>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={props.fieldRuleForm.canRead} onChange={(event) => props.setFieldRuleForm({ ...props.fieldRuleForm, canRead: event.target.checked })} />可讀</label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={props.fieldRuleForm.canWrite} onChange={(event) => props.setFieldRuleForm({ ...props.fieldRuleForm, canWrite: event.target.checked })} />可寫</label>
            <DialogActions onCancel={props.closeDialog} />
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={props.dialogMode === "masking"} onOpenChange={(open) => !open && props.closeDialog()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Sensitive Data Masking</DialogTitle></DialogHeader>
          <form className="grid gap-4" onSubmit={props.submitMaskingRule}>
            <Field label="Policy"><Select value={props.maskingRuleForm.policyId} onChange={(value) => props.setMaskingRuleForm({ ...props.maskingRuleForm, policyId: value })} options={[["", "請選擇"], ...policyOptions]} required /></Field>
            <Field label="Resource"><Input value={props.maskingRuleForm.resourceCode} onChange={(event) => props.setMaskingRuleForm({ ...props.maskingRuleForm, resourceCode: event.target.value })} required /></Field>
            <Field label="Field"><Input value={props.maskingRuleForm.fieldName} onChange={(event) => props.setMaskingRuleForm({ ...props.maskingRuleForm, fieldName: event.target.value })} required /></Field>
            <Field label="Masking Type"><Input value={props.maskingRuleForm.maskingType} onChange={(event) => props.setMaskingRuleForm({ ...props.maskingRuleForm, maskingType: event.target.value })} /></Field>
            <Field label="Pattern"><Input value={props.maskingRuleForm.maskingPattern} onChange={(event) => props.setMaskingRuleForm({ ...props.maskingRuleForm, maskingPattern: event.target.value })} /></Field>
            <DialogActions onCancel={props.closeDialog} />
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RulePanel({
  title,
  rows,
  canAdd,
  canDelete,
  onAdd,
  onDelete,
}: {
  title: string;
  rows: Array<{ id: string; resourceCode: string; status: string }>;
  canAdd: boolean;
  canDelete: boolean;
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  const columns: GridColDef[] = [
    { field: "resourceCode", headerName: "Resource", minWidth: 150, flex: 1 },
    { field: "status", headerName: "狀態", minWidth: 90 },
    {
      field: "actions",
      headerName: "",
      minWidth: 70,
      sortable: false,
      renderCell: (params) => canDelete ? (
        <IconButton title="刪除" danger onClick={() => onDelete(String(params.row.id))}><Trash2 className="h-4 w-4" /></IconButton>
      ) : null,
    },
  ];
  return (
    <Panel title={title} action={canAdd ? <Button onClick={onAdd} className="bg-indigo-600 text-white hover:bg-indigo-700"><Plus className="h-4 w-4" />新增</Button> : null}>
      <DataGrid rows={rows} columns={columns} disableRowSelectionOnClick />
    </Panel>
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

function JsonField({ label, value, onChange }: { label: string; value: Record<string, unknown>; onChange: (value: Record<string, unknown>) => void }) {
  const [text, setText] = useState(JSON.stringify(value, null, 2));
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700 md:col-span-2">
      {label}
      <textarea
        className="min-h-24 rounded-md border px-3 py-2 font-mono text-xs"
        value={text}
        onChange={(event) => {
          const nextText = event.target.value;
          setText(nextText);
          try {
            onChange(JSON.parse(nextText) as Record<string, unknown>);
          } catch {
          }
        }}
      />
    </label>
  );
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
        <div className="text-lg font-semibold text-[#12344a]">沒有組織資料權限</div>
        <p className="mt-2 text-sm leading-6 text-[#5d7b90]">需要 organization-scope.view 權限才能檢視組織與資料權限設定。</p>
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

function roleOptions(roles: Role[], emptyLabel: string): Array<[string, string]> {
  return [["", emptyLabel], ...roles.map((role) => [role.id, role.name] as [string, string])];
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
