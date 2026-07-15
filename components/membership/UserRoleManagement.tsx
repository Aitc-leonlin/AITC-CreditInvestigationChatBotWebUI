"use client";

import { useEffect, useRef, useState } from "react";
import { DataGrid, type GridColDef, type GridRowParams } from "@mui/x-data-grid";
import { Save, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { fetchMembershipUsers, type MembershipUser } from "@/services/api/membershipUsersApi";
import {
  fetchRoles,
  fetchUserRoleIds,
  setUserRoleIds,
  type Role,
} from "@/services/api/membershipRbacApi";
import { MODULE_PERMISSIONS } from "@/data/modulePermissions";
import { useMembershipPermissions } from "@/hooks/useMembershipPermissions";

export default function UserRoleManagement() {
  const { hasPermission, isLoading: isPermissionLoading } = useMembershipPermissions();
  const canRead = hasPermission(MODULE_PERMISSIONS.rbacView);
  const canEdit = hasPermission(MODULE_PERMISSIONS.rbacEdit);
  const [users, setUsers] = useState<MembershipUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedUser, setSelectedUser] = useState<MembershipUser | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [originalRoleIds, setOriginalRoleIds] = useState<Set<string>>(new Set());
  const [anchorRoleId, setAnchorRoleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const roleItemRefs = useRef<Map<string, HTMLLabelElement>>(new Map());

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!anchorRoleId) return;

    window.requestAnimationFrame(() => {
      roleItemRefs.current.get(anchorRoleId)?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    });
  }, [anchorRoleId]);

  async function loadData() {
    try {
      setIsLoading(true);
      const [userResult, roleRows] = await Promise.all([
        fetchMembershipUsers({ page: 1, pageSize: 100 }),
        fetchRoles(),
      ]);
      setUsers(userResult.users);
      setRoles(roleRows.filter((role) => role.status === "ACTIVE"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "讀取使用者角色資料失敗");
    } finally {
      setIsLoading(false);
    }
  }

  async function selectUser(user: MembershipUser) {
    try {
      setSelectedUser(user);
      setAnchorRoleId(null);
      const result = await fetchUserRoleIds(user.id);
      const nextRoleIds = new Set(result.roleIds);
      const firstSelectedRole = roles.find((role) => nextRoleIds.has(role.id));
      setSelectedRoleIds(nextRoleIds);
      setOriginalRoleIds(new Set(result.roleIds));
      setAnchorRoleId(firstSelectedRole?.id ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "讀取使用者角色失敗");
    }
  }

  async function saveUserRoles() {
    if (!selectedUser) return;
    if (!canEdit) {
      toast.error("目前帳號沒有 rbac.edit 權限。");
      return;
    }
    try {
      await setUserRoleIds(
        selectedUser.id,
        Array.from(selectedRoleIds),
        selectedUser.organizationId,
      );
      toast.success("已更新使用者角色");
      setOriginalRoleIds(new Set(selectedRoleIds));
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "更新使用者角色失敗");
    }
  }

  const hasRoleChanges = !areSetsEqual(selectedRoleIds, originalRoleIds);

  const columns: GridColDef<MembershipUser>[] = [
      { field: "username", headerName: "帳號", minWidth: 160, flex: 0.7 },
      { field: "displayName", headerName: "姓名", minWidth: 160, flex: 0.7 },
      { field: "email", headerName: "Email", minWidth: 220, flex: 1 },
      { field: "organizationName", headerName: "組織", minWidth: 140, flex: 0.6 },
    ];

  if (isPermissionLoading) return null;

  if (!canRead) {
    return <AccessDenied title="使用者角色設定" />;
  }

  return (
    <main className="h-full overflow-hidden bg-[#f8fcff]">
      <div className="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-4 px-5 py-5 md:px-7">
        <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#12344a]">使用者角色設定</h1>
            <p className="mt-1 text-sm text-[#5d7b90]">替使用者設定多個角色，權限會依所有啟用角色彙整。</p>
          </div>
        </section>
        <SelectedUserSummary user={selectedUser} />
        <section className="grid min-h-0 gap-4 md:grid-cols-[minmax(0,1fr)_360px]">
          <div className="overflow-hidden rounded-lg border border-[#d6e8f4] bg-white">
            <DataGrid
              rows={users}
              columns={columns}
              loading={isLoading}
              getRowHeight={() => 58}
              onRowClick={(params: GridRowParams<MembershipUser>) => void selectUser(params.row)}
              getRowClassName={(params) => (params.row.id === selectedUser?.id ? "bg-indigo-50" : "")}
              sx={{
                "& .MuiDataGrid-row": { cursor: "pointer" },
                "& .MuiDataGrid-row:hover": { backgroundColor: "#eef2ff" },
              }}
            />
          </div>
          <aside className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-lg border border-[#d6e8f4] bg-white">
            <div className="border-b border-[#d6e8f4] px-4 py-3 text-sm font-semibold text-[#12344a]">角色清單</div>
            <div className="min-h-0 overflow-y-auto p-4">
              <div className="grid gap-2">
                {roles.map((role) => (
                  <label
                    key={role.id}
                    ref={(element) => {
                      if (element) roleItemRefs.current.set(role.id, element);
                      else roleItemRefs.current.delete(role.id);
                    }}
                    className={`flex items-start gap-3 rounded-md border p-3 text-sm ${
                      selectedRoleIds.has(role.id) ? "border-indigo-200 bg-indigo-50/70" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedRoleIds.has(role.id)}
                      disabled={!selectedUser || !canEdit}
                      onChange={(event) => {
                        setSelectedRoleIds((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.add(role.id);
                          else next.delete(role.id);
                          return next;
                        });
                      }}
                    />
                    <span>
                      <span className="block font-semibold text-slate-900">{role.name}</span>
                      <span className="block text-xs text-slate-500">{role.code}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            {canEdit ? (
              <div className="border-t border-[#d6e8f4] bg-white p-4">
                <Button className="w-full bg-indigo-600 text-white hover:bg-indigo-700" disabled={!selectedUser || !hasRoleChanges} onClick={() => void saveUserRoles()}>
                  <Save className="h-4 w-4" />
                  儲存角色
                </Button>
              </div>
            ) : null}
          </aside>
        </section>
      </div>
    </main>
  );
}

function SelectedUserSummary({ user }: { user: MembershipUser | null }) {
  return (
    <section className="rounded-lg border border-[#d6e8f4] bg-white p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#12344a]">
        <UserRoundCheck className="h-4 w-4 text-indigo-600" />
        當前選取帳號
      </div>
      {user ? (
        <div className="grid gap-3 md:grid-cols-5">
          <SummaryItem label="帳號" value={user.username} />
          <SummaryItem label="姓名" value={user.displayName} />
          <SummaryItem label="Email" value={user.email} />
          <SummaryItem label="組織" value={user.organizationName || user.organizationId || "-"} />
          <SummaryItem label="狀態" value={user.status === "ACTIVE" ? "啟用" : "停用"} />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-5">
          <SummaryItem label="帳號" value="" />
          <SummaryItem label="姓名" value="" />
          <SummaryItem label="Email" value="" />
          <SummaryItem label="組織" value="" />
          <SummaryItem label="狀態" value="" />
        </div>
      )}
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-[#f8fcff] px-3 py-2">
      <div className="text-xs font-medium text-[#5d7b90]">{label}</div>
      <div className="mt-1 min-h-5 truncate text-sm font-semibold leading-5 text-slate-900">
        {value || <span className="invisible">-</span>}
      </div>
    </div>
  );
}

function areSetsEqual(left: Set<string>, right: Set<string>) {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
}

function AccessDenied({ title }: { title: string }) {
  return (
    <main className="grid h-full place-items-center bg-[#f8fcff] p-6">
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <div className="text-lg font-semibold">{title}</div>
        <div className="mt-2 text-sm">目前帳號沒有 rbac.view 權限。</div>
      </section>
    </main>
  );
}
