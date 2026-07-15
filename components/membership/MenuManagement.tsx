"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Tooltip } from "@mui/material";
import { DataGrid, type GridColDef, type GridRenderCellParams } from "@mui/x-data-grid";
import { Eye, PanelLeft, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { MembershipAccessDenied } from "@/components/membership/authorization";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  createMembershipMenu,
  deleteMembershipMenu,
  fetchMembershipMenus,
  fetchMenuPermissions,
  setMenuPermission,
  updateMembershipMenu,
  type MembershipMenu,
  type MenuPayload,
  type MenuPermission,
} from "@/services/api/membershipMenuApi";
import { useMembershipPermissions } from "@/hooks/useMembershipPermissions";
import { fetchPermissions, fetchRoles, type Permission, type Role } from "@/services/api/membershipRbacApi";

const EMPTY_MENU: MenuPayload = {
  code: "",
  title: "",
  parentId: null,
  routePath: "",
  componentKey: "",
  icon: "",
  sortOrder: 0,
  status: "ACTIVE",
  requiredPermissionCode: null,
};

function flattenMenus(
  menus: MembershipMenu[],
  depth = 0,
): Array<MembershipMenu & { depth: number }> {
  return menus.flatMap((menu) => [
    { ...menu, depth },
    ...flattenMenus(menu.children, depth + 1),
  ]);
}

export default function MenuManagement() {
  const { hasPermission, isLoading: isPermissionLoading } = useMembershipPermissions();
  const canRead = hasPermission("menu.read");
  const canManage = hasPermission("menu.manage");
  const [menus, setMenus] = useState<MembershipMenu[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [menuForm, setMenuForm] = useState<MenuPayload>(EMPTY_MENU);
  const [selectedMenu, setSelectedMenu] = useState<MembershipMenu | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [menuPermissions, setMenuPermissions] = useState<MenuPermission[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const rows = useMemo(() => flattenMenus(menus), [menus]);

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    try {
      setIsLoading(true);
      const [menuRows, roleRows, permissionRows] = await Promise.all([
        fetchMembershipMenus(),
        fetchRoles(),
        fetchPermissions(),
      ]);
      setMenus(menuRows);
      setRoles(roleRows);
      setPermissions(permissionRows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "讀取選單資料失敗");
    } finally {
      setIsLoading(false);
    }
  }

  function openCreate(parentId: string | null = null) {
    setSelectedMenu(null);
    setMenuForm({ ...EMPTY_MENU, parentId });
    setDialogOpen(true);
  }

  function openEdit(menu: MembershipMenu) {
    setSelectedMenu(menu);
    setMenuForm({
      code: menu.code,
      title: menu.title,
      parentId: menu.parentId,
      routePath: menu.routePath,
      componentKey: menu.componentKey,
      icon: menu.icon,
      sortOrder: menu.sortOrder,
      status: menu.status,
      requiredPermissionCode: menu.requiredPermissionCode,
    });
    setDialogOpen(true);
  }

  async function openMapping(menu: MembershipMenu) {
    try {
      setSelectedMenu(menu);
      setMenuPermissions(await fetchMenuPermissions(menu.id));
      setMappingOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "讀取選單角色權限失敗");
    }
  }

  async function submitMenu(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      if (selectedMenu) await updateMembershipMenu(selectedMenu.id, menuForm);
      else await createMembershipMenu(menuForm);
      toast.success("已儲存選單");
      setDialogOpen(false);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "儲存選單失敗");
    }
  }

  async function removeMenu(menu: MembershipMenu) {
    try {
      await deleteMembershipMenu(menu.id);
      toast.success("已刪除選單");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "刪除選單失敗");
    }
  }

  async function saveRoleMenuPermission(role: Role, current: MenuPermission | undefined) {
    if (!selectedMenu) return;
    try {
      await setMenuPermission(selectedMenu.id, {
        roleId: role.id,
        canView: current?.canView ?? true,
        canCreate: current?.canCreate ?? false,
        canUpdate: current?.canUpdate ?? false,
        canDelete: current?.canDelete ?? false,
      });
      setMenuPermissions(await fetchMenuPermissions(selectedMenu.id));
      toast.success("已更新選單權限");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "更新選單權限失敗");
    }
  }

  function updateMapping(roleId: string, key: keyof Pick<MenuPermission, "canView" | "canCreate" | "canUpdate" | "canDelete">, value: boolean) {
    setMenuPermissions((current) => {
      const existing = current.find((item) => item.roleId === roleId);
      if (existing) return current.map((item) => (item.roleId === roleId ? { ...item, [key]: value } : item));
      const role = roles.find((item) => item.id === roleId);
      if (!role || !selectedMenu) return current;
      return [
        ...current,
        {
          id: `draft-${roleId}`,
          menuId: selectedMenu.id,
          roleId,
          roleCode: role.code,
          roleName: role.name,
          canView: key === "canView" ? value : true,
          canCreate: key === "canCreate" ? value : false,
          canUpdate: key === "canUpdate" ? value : false,
          canDelete: key === "canDelete" ? value : false,
          createdAt: "",
          updatedAt: "",
        },
      ];
    });
  }

  const columns: GridColDef<MembershipMenu & { depth: number }>[] = [
    {
      field: "title",
      headerName: "選單",
      minWidth: 220,
      flex: 0.8,
      renderCell: (params: GridRenderCellParams<MembershipMenu & { depth: number }>) => (
        <div className="flex h-full items-center gap-2" style={{ paddingLeft: params.row.depth * 18 }}>
          <PanelLeft className="h-4 w-4 text-indigo-600" />
          <span>{params.row.title}</span>
        </div>
      ),
    },
    { field: "code", headerName: "代碼", minWidth: 180, flex: 0.7 },
    { field: "routePath", headerName: "Route", minWidth: 190, flex: 0.8 },
    { field: "componentKey", headerName: "Component", minWidth: 190, flex: 0.8 },
    { field: "requiredPermissionCode", headerName: "需要權限", minWidth: 170, flex: 0.7 },
    { field: "sortOrder", headerName: "排序", minWidth: 80 },
    {
      field: "actions",
      headerName: "操作",
      minWidth: 210,
      sortable: false,
      renderCell: (params: GridRenderCellParams<MembershipMenu & { depth: number }>) => (
        <div className="flex h-full items-center gap-1.5">
          <IconButton title="角色可視權限" onClick={() => void openMapping(params.row)}>
            <Eye className="h-4 w-4" />
          </IconButton>
          {canManage ? (
            <>
              <IconButton title="新增子選單" onClick={() => openCreate(params.row.id)}>
                <Plus className="h-4 w-4" />
              </IconButton>
              <IconButton title="編輯" onClick={() => openEdit(params.row)}>
                <Pencil className="h-4 w-4" />
              </IconButton>
              <IconButton title="刪除" danger onClick={() => void removeMenu(params.row)}>
                <Trash2 className="h-4 w-4" />
              </IconButton>
            </>
          ) : null}
        </div>
      ),
    },
  ];

  if (isPermissionLoading) return null;
  if (!canRead) return <MembershipAccessDenied title="選單管理" />;

  return (
    <main className="h-full overflow-hidden bg-[#f8fcff]">
      <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4 px-5 py-5 md:px-7">
        <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#12344a]">選單管理</h1>
            <p className="mt-1 text-sm text-[#5d7b90]">維護動態選單、route、元件 key 與角色可視權限。</p>
          </div>
          {canManage ? (
            <Button onClick={() => openCreate()} className="bg-indigo-600 text-white hover:bg-indigo-700">
              <Plus className="h-4 w-4" />
              新增選單
            </Button>
          ) : null}
        </section>
        <section className="min-h-0 overflow-hidden rounded-lg border border-[#d6e8f4] bg-white">
          <DataGrid rows={rows} columns={columns} loading={isLoading} disableRowSelectionOnClick getRowHeight={() => 58} />
        </section>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedMenu ? "修改選單" : "新增選單"}</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={submitMenu}>
            <Field label="選單代碼"><Input value={menuForm.code} onChange={(event) => setMenuForm({ ...menuForm, code: event.target.value })} required /></Field>
            <Field label="選單名稱"><Input value={menuForm.title} onChange={(event) => setMenuForm({ ...menuForm, title: event.target.value })} required /></Field>
            <Field label="上層選單">
              <select className="h-9 rounded-md border px-3 text-sm" value={menuForm.parentId ?? ""} onChange={(event) => setMenuForm({ ...menuForm, parentId: event.target.value || null })}>
                <option value="">無</option>
                {rows.filter((menu) => menu.id !== selectedMenu?.id).map((menu) => (
                  <option key={menu.id} value={menu.id}>{`${"　".repeat(menu.depth)}${menu.title}`}</option>
                ))}
              </select>
            </Field>
            <Field label="Route Path"><Input value={menuForm.routePath} onChange={(event) => setMenuForm({ ...menuForm, routePath: event.target.value })} /></Field>
            <Field label="Component Key"><Input value={menuForm.componentKey} onChange={(event) => setMenuForm({ ...menuForm, componentKey: event.target.value })} /></Field>
            <Field label="Icon"><Input value={menuForm.icon} onChange={(event) => setMenuForm({ ...menuForm, icon: event.target.value })} placeholder="例：Users, PanelLeft" /></Field>
            <Field label="需要權限">
              <select className="h-9 rounded-md border px-3 text-sm" value={menuForm.requiredPermissionCode ?? ""} onChange={(event) => setMenuForm({ ...menuForm, requiredPermissionCode: event.target.value || null })}>
                <option value="">無</option>
                {permissions.map((permission) => <option key={permission.id} value={permission.code}>{permission.code}</option>)}
              </select>
            </Field>
            <Field label="排序"><Input type="number" value={menuForm.sortOrder} onChange={(event) => setMenuForm({ ...menuForm, sortOrder: Number(event.target.value) })} /></Field>
            <Field label="狀態">
              <select className="h-9 rounded-md border px-3 text-sm" value={menuForm.status} onChange={(event) => setMenuForm({ ...menuForm, status: event.target.value as MenuPayload["status"] })}>
                <option value="ACTIVE">啟用</option>
                <option value="INACTIVE">停用</option>
              </select>
            </Field>
            <div className="flex justify-end gap-2 md:col-span-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-700">儲存</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={mappingOpen} onOpenChange={setMappingOpen}>
        <DialogContent className="max-h-[86vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>選單角色權限：{selectedMenu?.title}</DialogTitle>
          </DialogHeader>
          {/* NOTE: canView 目前會影響使用者可見選單；canCreate/canUpdate/canDelete 尚未串接成後端 API 操作 enforcement。 */}
          <div className="grid gap-3">
            {roles.map((role) => {
              const current = menuPermissions.find((item) => item.roleId === role.id);
              return (
                <div key={role.id} className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-[minmax(160px,1fr)_repeat(4,90px)_auto] md:items-center">
                  <div>
                    <div className="font-medium text-slate-900">{role.name}</div>
                    <div className="text-xs text-slate-500">{role.code}</div>
                  </div>
                  {(["canView", "canCreate", "canUpdate", "canDelete"] as const).map((key) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={current?.[key] ?? (key === "canView")}
                        onChange={(event) => updateMapping(role.id, key, event.target.checked)}
                        disabled={!canManage}
                      />
                      {key.replace("can", "")}
                    </label>
                  ))}
                  {canManage ? (
                    <Button type="button" size="sm" onClick={() => void saveRoleMenuPermission(role, menuPermissions.find((item) => item.roleId === role.id))}>
                      <Save className="h-4 w-4" />
                      儲存
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  );
}

function IconButton({
  title,
  children,
  onClick,
  danger = false,
}: {
  title: string;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <Tooltip title={title} arrow placement="top">
      <button
        type="button"
        aria-label={title}
        onClick={onClick}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
          danger
            ? "border-red-200 text-red-600 hover:bg-red-50"
            : "border-slate-200 text-slate-700 hover:bg-slate-50"
        }`}
      >
        {children}
      </button>
    </Tooltip>
  );
}
